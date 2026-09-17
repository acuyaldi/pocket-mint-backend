import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantConversationService } from '../../src/assistant/conversation.service';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 5 }) : undefined;
const userIds: string[] = [];
afterAll(() => resources?.close());
afterEach(async () => {
  if (!resources || !userIds.length) return;
  await resources.prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
});

describe.skipIf(!url)('Assistant conversation service (disposable PostgreSQL)', () => {
  const db = () => resources!.prisma;
  const service = () => createAssistantConversationService(db());
  async function user(label: string) {
    const row = await db().user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
    userIds.push(row.id); return row.id;
  }

  it('persists ordered messages, a successful tool record, and updates activity', async () => {
    const owner = await user('owner');
    const before = new Date();
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'analytics.monthly-spending-summary', locale: 'id-ID', content: 'Halo', source: 'USER_PROVIDED' });
    await service().markTurnRunning(turn.turnId);
    const executionId = await service().beginToolExecution({ ...turn, correlationId: `tool-${Date.now()}`, toolId: 'analytics.monthly-spending-summary', capability: 'analytics.read', riskLevel: 'LOW', policyDecision: 'EXECUTE_IMMEDIATELY', redactedInput: { month: '2026-07' } });
    await service().finalize({ ...turn, executionId, status: 'SUCCEEDED', turnStatus: 'SUCCEEDED', assistantContent: 'Ringkasan', assistantSource: 'DETERMINISTIC_RENDERER', durationMs: 4, outputSummary: { month: '2026-07', transactionCount: 1, categoryCount: 1 } });
    const detail = await service().getOwnedConversation(owner, turn.conversationId);
    expect(detail.messages.items.map((m) => [m.role, m.content, m.source])).toEqual([
      ['USER', 'Halo', 'USER_PROVIDED'], ['ASSISTANT', 'Ringkasan', 'DETERMINISTIC_RENDERER'],
    ]);
    const persisted = await db().assistantToolExecution.findUniqueOrThrow({ where: { id: executionId } });
    expect(persisted.status).toBe('SUCCEEDED');
    expect(persisted.outputSummary).toEqual({ month: '2026-07', transactionCount: 1, categoryCount: 1 });
    expect(detail.conversation.lastActivityAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('makes unknown and cross-user IDs indistinguishable and scopes listing', async () => {
    const owner = await user('owner-a'); const other = await user('owner-b');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });
    for (const id of [turn.conversationId, 'missing']) {
      await expect(service().getOwnedConversation(other, id)).rejects.toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND' });
    }
    const ownedList = await service().listOwnedConversations(owner);
    expect(ownedList.items).toHaveLength(1);
    expect(ownedList.items[0]).not.toHaveProperty('userId');
    expect((await service().listOwnedConversations(other)).items).toHaveLength(0);
  });

  it('archives idempotently and prevents continuation', async () => {
    const owner = await user('archive');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });
    const first = await service().archiveOwnedConversation(owner, turn.conversationId);
    const second = await service().archiveOwnedConversation(owner, turn.conversationId);
    expect(first.status).toBe('ARCHIVED'); expect(second.archivedAt).toEqual(first.archivedAt);
    await expect(service().beginTurn({ userId: owner, conversationId: turn.conversationId, correlationId: `next-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' })).rejects.toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_CONTINUABLE' });
  });

  it('restores idempotently and allows continuation again', async () => {
    const owner = await user('restore');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });
    await service().archiveOwnedConversation(owner, turn.conversationId);
    const first = await service().restoreOwnedConversation(owner, turn.conversationId);
    const second = await service().restoreOwnedConversation(owner, turn.conversationId);
    expect(first.status).toBe('ACTIVE'); expect(first.archivedAt).toBeNull(); expect(second.status).toBe('ACTIVE');
    await expect(service().beginTurn({ userId: owner, conversationId: turn.conversationId, correlationId: `next-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' })).resolves.toBeDefined();
  });

  it('titles a conversation from its first USER message, not the latest message of any role', async () => {
    const owner = await user('title');
    const first = await service().beginTurn({ userId: owner, correlationId: `corr-1-${Date.now()}`, intent: 'transaction.create', locale: 'id-ID', content: 'bayar internet 350rb dari bca', source: 'USER_PROVIDED' });
    await service().finalizeWithoutTool({ ...first, turnStatus: 'CLARIFICATION_REQUIRED', assistantContent: 'Wallet yang dimaksud belum jelas...', assistantSource: 'PROVIDER_CLARIFICATION' });
    const second = await service().beginTurn({ userId: owner, conversationId: first.conversationId, correlationId: `corr-2-${Date.now()}`, intent: 'transaction.create', locale: 'id-ID', content: 'Pilih opsi klarifikasi.', source: 'USER_PROVIDED' });
    await service().finalizeWithoutTool({ ...second, turnStatus: 'SUCCEEDED', assistantContent: 'Konfirmasi draft transaksi cmsk3ft4d000cfj12609ngx5.', assistantSource: 'DETERMINISTIC_RENDERER' });

    const list = await service().listOwnedConversations(owner);
    expect(list.items).toHaveLength(1);
    expect(list.items[0].title).toBe('bayar internet 350rb dari bca');
    expect(list.items[0].lastMessage).toBe('Konfirmasi draft transaksi cmsk3ft4d000cfj12609ngx5.');
  });

  it('permanently deletes an owned conversation and its history', async () => {
    const owner = await user('delete');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });
    await service().deleteOwnedConversation(owner, turn.conversationId);
    await expect(service().getOwnedConversation(owner, turn.conversationId)).rejects.toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND' });
    expect((await service().listOwnedConversations(owner)).items).toHaveLength(0);
    expect(await db().assistantMessage.count({ where: { conversationId: turn.conversationId } })).toBe(0);
    expect(await db().assistantTurn.count({ where: { conversationId: turn.conversationId } })).toBe(0);
  });

  it('makes deleting an unknown or cross-user conversation indistinguishable from not-found and leaves it intact on failure', async () => {
    const owner = await user('delete-owner'); const other = await user('delete-other');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });
    for (const id of [turn.conversationId, 'missing']) {
      await expect(service().deleteOwnedConversation(other, id)).rejects.toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND' });
    }
    expect(await db().assistantConversation.findUnique({ where: { id: turn.conversationId } })).not.toBeNull();
  });

  it('caps pagination at 100 and exposes a RUNNING turn as incomplete without retrying it', async () => {
    const owner = await user('running');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-running-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });
    await service().markTurnRunning(turn.turnId);
    const executionId = await service().beginToolExecution({ ...turn, correlationId: `tool-running-${Date.now()}`, toolId: 'analytics.monthly-spending-summary', capability: 'analytics.read', riskLevel: 'LOW', policyDecision: 'EXECUTE_IMMEDIATELY' });

    const detail = await service().getOwnedConversation(owner, turn.conversationId, 1, 1000);
    expect(detail.messages.limit).toBe(100);
    expect(detail.turns[0]).toMatchObject({ status: 'RUNNING', finishedAt: null });
    expect(detail.turns[0].toolExecutions[0]).toMatchObject({ id: executionId, status: 'RUNNING', completedAt: null });
    expect(await db().assistantToolExecution.count({ where: { turnId: turn.turnId } })).toBe(1);
  });

  it('rejects oversized content at the persistence boundary without creating records', async () => {
    const owner = await user('oversized');
    await expect(service().beginTurn({ userId: owner, correlationId: `corr-large-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'x'.repeat(10_001), source: 'USER_PROVIDED' })).rejects.toMatchObject({ code: 'ASSISTANT_INVALID_REQUEST' });
    expect(await db().assistantConversation.count({ where: { userId: owner } })).toBe(0);
    expect(await db().assistantTurn.count()).toBe(0);
    expect(await db().assistantMessage.count()).toBe(0);
    expect(await db().assistantToolExecution.count()).toBe(0);
  });
});
