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
