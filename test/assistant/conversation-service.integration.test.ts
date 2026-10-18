import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client';
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

  it('restores idempotently, preserves title/sourceChannels, and allows continuation again', async () => {
    const owner = await user('restore');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'jajan kopi 20rb', source: 'USER_PROVIDED' });
    await db().assistantTurn.update({ where: { id: turn.turnId }, data: { channel: 'TELEGRAM' } });
    await service().archiveOwnedConversation(owner, turn.conversationId);
    const first = await service().restoreOwnedConversation(owner, turn.conversationId);
    const second = await service().restoreOwnedConversation(owner, turn.conversationId);
    expect(first.status).toBe('ACTIVE'); expect(first.archivedAt).toBeNull(); expect(second.status).toBe('ACTIVE');
    const list = await service().listOwnedConversations(owner);
    expect(list.items[0]).toMatchObject({ title: 'jajan kopi 20rb', sourceChannels: ['TELEGRAM'] });
    await expect(service().beginTurn({ userId: owner, conversationId: turn.conversationId, correlationId: `next-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' })).resolves.toBeDefined();
  });

  it('archive preserves messages, tool history, and channel/delivery metadata (Phase 33)', async () => {
    const owner = await user('archive-preserve');
    const webTurn = await service().beginTurn({ userId: owner, correlationId: `corr-web-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'halo', source: 'USER_PROVIDED' });
    await service().finalizeWithoutTool({ ...webTurn, turnStatus: 'SUCCEEDED', assistantContent: 'balas', assistantSource: 'DETERMINISTIC_RENDERER' });
    const telegramTurn = await service().beginTurn({ userId: owner, conversationId: webTurn.conversationId, correlationId: `corr-tg-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'lanjut', source: 'USER_PROVIDED' });
    await db().assistantTurn.update({ where: { id: telegramTurn.turnId }, data: { channel: 'TELEGRAM' } });
    const job = await db().channelInboundJob.create({ data: {
      provider: 'TELEGRAM', externalUpdateId: `upd-${telegramTurn.turnId}`, externalSenderId: 'sender', externalChatId: 'chat',
      text: 'lanjut', status: 'SUCCEEDED', assistantTurnId: telegramTurn.turnId,
    } });
    await db().channelOutboundDelivery.create({ data: {
      inboundJobId: job.id, provider: 'TELEGRAM', kind: 'SEND_MESSAGE', destinationChatId: 'chat', renderedText: 'reply', status: 'SENT',
    } });

    await service().archiveOwnedConversation(owner, webTurn.conversationId);

    const detail = await service().getOwnedConversation(owner, webTurn.conversationId);
    expect(detail.conversation.status).toBe('ARCHIVED');
    expect(detail.messages.items.map((m) => [m.role, m.content])).toEqual([['USER', 'halo'], ['ASSISTANT', 'balas'], ['USER', 'lanjut']]);
    expect(detail.conversation.sourceChannels).toEqual(['WEB', 'TELEGRAM']);
    expect(detail.turns.find((t) => t.id === telegramTurn.turnId)).toMatchObject({ deliveryStatus: 'DELIVERED' });
    const list = await service().listOwnedConversations(owner);
    expect(list.items[0]).toMatchObject({ status: 'ARCHIVED', sourceChannels: ['WEB', 'TELEGRAM'] });
  });

  it('does not block finalizing an in-flight RUNNING turn after its conversation is archived mid-request (Phase 33)', async () => {
    const owner = await user('archive-running');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'USER_PROVIDED' });
    await service().markTurnRunning(turn.turnId);
    await service().archiveOwnedConversation(owner, turn.conversationId);

    await expect(service().finalizeWithoutTool({ ...turn, turnStatus: 'SUCCEEDED', assistantContent: 'done', assistantSource: 'DETERMINISTIC_RENDERER' })).resolves.toBeUndefined();
    const persisted = await db().assistantTurn.findUniqueOrThrow({ where: { id: turn.turnId } });
    expect(persisted.status).toBe('SUCCEEDED');
  });

  it('makes archiving and restoring an unknown or cross-user conversation indistinguishable from not-found (Phase 33)', async () => {
    const owner = await user('lifecycle-owner'); const other = await user('lifecycle-other');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });
    for (const id of [turn.conversationId, 'missing']) {
      await expect(service().archiveOwnedConversation(other, id)).rejects.toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND' });
      await expect(service().restoreOwnedConversation(other, id)).rejects.toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND' });
    }
    const untouched = await db().assistantConversation.findUniqueOrThrow({ where: { id: turn.conversationId } });
    expect(untouched.status).toBe('ACTIVE');
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

  it('deletes a conversation with a pending financial draft and a pending clarification without error (Phase 33)', async () => {
    const owner = await user('delete-pending');
    const wallet = await db().wallet.create({ data: { userId: owner, name: 'Cash', type: 'CASH' } });
    const category = await db().category.create({ data: { userId: owner, name: 'Food', type: 'EXPENSE' } });
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'transaction.create', locale: 'id-ID', content: 'beli kopi 20rb', source: 'USER_PROVIDED' });
    const execution = await db().assistantToolExecution.create({ data: {
      conversationId: turn.conversationId, turnId: turn.turnId, toolId: 'transaction.create', capability: 'transaction.create',
      riskLevel: 'HIGH', policyDecision: 'DRAFT_AND_CONFIRM', status: 'SUCCEEDED', correlationId: `exec-${turn.turnId}`,
    } });
    const draft = await db().assistantFinancialDraft.create({ data: {
      userId: owner, conversationId: turn.conversationId, originatingTurnId: turn.turnId, originatingExecutionId: execution.id,
      operation: 'transaction.create', transactionType: 'EXPENSE', amount: new Prisma.Decimal('20000'),
      walletId: wallet.id, categoryId: category.id, transactionDate: new Date(), expiresAt: new Date(Date.now() + 15 * 60_000),
    } });
    const clarification = await db().clarificationRequest.create({ data: {
      userId: owner, conversationId: turn.conversationId, originatingTurnId: turn.turnId, executionId: `clar-exec-${turn.turnId}`,
      entityType: 'wallet', trustedContext: {}, prompt: 'Wallet mana?', expiresAt: new Date(Date.now() + 15 * 60_000),
    } });

    await service().deleteOwnedConversation(owner, turn.conversationId);

    expect(await db().assistantFinancialDraft.findUnique({ where: { id: draft.id } })).toBeNull();
    expect(await db().clarificationRequest.findUnique({ where: { id: clarification.id } })).toBeNull();
    expect(await db().assistantConversation.findUnique({ where: { id: turn.conversationId } })).toBeNull();
  });

  it('SetNulls ChannelConnection.conversationId instead of blocking delete, leaving the link intact but pointing at nothing (Phase 33)', async () => {
    const owner = await user('delete-channel-linked');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'USER_PROVIDED' });
    const connection = await db().channelConnection.create({ data: {
      userId: owner, provider: 'TELEGRAM', externalUserId: `ext-${owner}`, externalChatId: `chat-${owner}`, conversationId: turn.conversationId,
    } });

    await service().deleteOwnedConversation(owner, turn.conversationId);

    const survivor = await db().channelConnection.findUniqueOrThrow({ where: { id: connection.id } });
    expect(survivor.conversationId).toBeNull();
    expect(survivor.status).toBe('ACTIVE');
  });

  it('leaves unenforced ChannelInboundJob.assistantTurnId and ChannelAssistantOperation.turnId pointing at a deleted turn — plain columns, not foreign keys (Phase 33)', async () => {
    const owner = await user('delete-channel-operational');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'USER_PROVIDED' });
    await db().assistantTurn.update({ where: { id: turn.turnId }, data: { channel: 'TELEGRAM' } });
    const job = await db().channelInboundJob.create({ data: {
      provider: 'TELEGRAM', externalUpdateId: `upd-${turn.turnId}`, externalSenderId: 'sender', externalChatId: 'chat',
      text: 'safe', status: 'SUCCEEDED', assistantTurnId: turn.turnId,
    } });
    const operation = await db().channelAssistantOperation.create({ data: {
      id: `channel:telegram:${job.id}`, userId: owner, turnId: turn.turnId, renderedText: 'reply',
    } });

    await service().deleteOwnedConversation(owner, turn.conversationId);

    // No @relation on either field (verified against prisma/schema.prisma) — deleting the
    // turn these point at neither cascades, restricts, nor SetNulls them. Both rows are
    // separately retention-managed (src/channels/retention.ts), not cleaned up by conversation delete.
    const survivingJob = await db().channelInboundJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(survivingJob.assistantTurnId).toBe(turn.turnId);
    const survivingOperation = await db().channelAssistantOperation.findUniqueOrThrow({ where: { id: operation.id } });
    expect(survivingOperation.turnId).toBe(turn.turnId);
  });

  it('never deletes the referenced Transaction when cascading away a conversation\'s draft/idempotency rows (Phase 33)', async () => {
    const owner = await user('delete-financial-safety');
    const wallet = await db().wallet.create({ data: { userId: owner, name: 'Cash', type: 'CASH' } });
    const category = await db().category.create({ data: { userId: owner, name: 'Food', type: 'EXPENSE' } });
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'transaction.create', locale: 'id-ID', content: 'beli kopi 20rb', source: 'USER_PROVIDED' });
    const execution = await db().assistantToolExecution.create({ data: {
      conversationId: turn.conversationId, turnId: turn.turnId, toolId: 'transaction.create', capability: 'transaction.create',
      riskLevel: 'HIGH', policyDecision: 'DRAFT_AND_CONFIRM', status: 'SUCCEEDED', correlationId: `exec-${turn.turnId}`,
    } });
    const transaction = await db().transaction.create({ data: {
      userId: owner, walletId: wallet.id, categoryId: category.id, type: 'EXPENSE', amount: new Prisma.Decimal('20000'), date: new Date(),
    } });
    const draft = await db().assistantFinancialDraft.create({ data: {
      userId: owner, conversationId: turn.conversationId, originatingTurnId: turn.turnId, originatingExecutionId: execution.id,
      operation: 'transaction.create', transactionType: 'EXPENSE', amount: new Prisma.Decimal('20000'),
      walletId: wallet.id, categoryId: category.id, transactionDate: new Date(), expiresAt: new Date(Date.now() + 15 * 60_000),
      status: 'COMMITTED', committedAt: new Date(), transactionId: transaction.id,
    } });
    await db().assistantIdempotencyRecord.create({ data: {
      userId: owner, turnId: turn.turnId, operation: 'transaction.create', key: `key-${turn.turnId}`, status: 'COMPLETED', transactionId: transaction.id,
    } });

    await service().deleteOwnedConversation(owner, turn.conversationId);

    expect(await db().assistantFinancialDraft.findUnique({ where: { id: draft.id } })).toBeNull();
    expect(await db().assistantIdempotencyRecord.findMany({ where: { turnId: turn.turnId } })).toHaveLength(0);
    const survivingTransaction = await db().transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(survivingTransaction.id).toBe(transaction.id);
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

  it('defaults a new turn to WEB channel attribution (Phase 30)', async () => {
    const owner = await user('channel-default');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-web-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'USER_PROVIDED' });
    const detail = await service().getOwnedConversation(owner, turn.conversationId);
    expect(detail.turns[0]).toMatchObject({ channel: 'WEB' });
    expect(detail.conversation.sourceChannels).toEqual(['WEB']);
    const list = await service().listOwnedConversations(owner);
    expect(list.items[0]?.sourceChannels).toEqual(['WEB']);
  });

  it('surfaces a Telegram-attributed turn without exposing any provider identifier (Phase 30)', async () => {
    const owner = await user('channel-telegram');
    const webTurn = await service().beginTurn({ userId: owner, correlationId: `corr-web-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'USER_PROVIDED' });
    const telegramTurn = await service().beginTurn({ userId: owner, conversationId: webTurn.conversationId, correlationId: `corr-tg-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'USER_PROVIDED' });
    // Simulates the channel inbound worker's post-hoc stamp (src/channels/workers/inbound.worker.ts `stampTelegramChannel`) — never threaded through beginTurn itself.
    await db().assistantTurn.update({ where: { id: telegramTurn.turnId }, data: { channel: 'TELEGRAM' } });

    const detail = await service().getOwnedConversation(owner, webTurn.conversationId);
    expect(detail.turns.map((t) => t.channel)).toEqual(['WEB', 'TELEGRAM']);
    expect(detail.conversation.sourceChannels).toEqual(['WEB', 'TELEGRAM']);
    expect(JSON.stringify(detail)).not.toMatch(/externalChatId|externalSenderId|externalUserId|callbackQueryId/i);

    const list = await service().listOwnedConversations(owner);
    expect(list.items[0]?.sourceChannels).toEqual(['WEB', 'TELEGRAM']);
  });

  it('aggregates channel delivery status from ChannelOutboundDelivery rows without exposing provider identifiers (Phase 31/32)', async () => {
    const owner = await user('delivery-status');
    const webTurn = await service().beginTurn({ userId: owner, correlationId: `corr-web-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'USER_PROVIDED' });

    async function telegramTurnWithDelivery(status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED_RETRYABLE' | 'FAILED_TERMINAL' | null) {
      const turn = await service().beginTurn({ userId: owner, conversationId: webTurn.conversationId, correlationId: `corr-tg-${status}-${Date.now()}-${Math.random()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'USER_PROVIDED' });
      await db().assistantTurn.update({ where: { id: turn.turnId }, data: { channel: 'TELEGRAM' } });
      const job = await db().channelInboundJob.create({ data: {
        provider: 'TELEGRAM', externalUpdateId: `upd-${turn.turnId}`, externalSenderId: 'sender', externalChatId: 'chat',
        text: 'safe', status: 'SUCCEEDED', assistantTurnId: turn.turnId,
      } });
      if (status) {
        await db().channelOutboundDelivery.create({ data: {
          inboundJobId: job.id, provider: 'TELEGRAM', kind: 'SEND_MESSAGE', destinationChatId: 'chat-secret-id',
          renderedText: 'reply text that must never leak', status,
        } });
      }
      return turn.turnId;
    }

    const pendingTurnId = await telegramTurnWithDelivery('PENDING');
    const sendingTurnId = await telegramTurnWithDelivery('SENDING');
    const sentTurnId = await telegramTurnWithDelivery('SENT');
    const retryableTurnId = await telegramTurnWithDelivery('FAILED_RETRYABLE');
    const terminalTurnId = await telegramTurnWithDelivery('FAILED_TERMINAL');
    const noDeliveryTurnId = await telegramTurnWithDelivery(null);

    const detail = await service().getOwnedConversation(owner, webTurn.conversationId, 1, 20);
    const byId = new Map(detail.turns.map((t) => [t.id, t]));
    expect(byId.get(webTurn.turnId)).toMatchObject({ deliveryStatus: 'NOT_APPLICABLE' });
    expect(byId.get(pendingTurnId)).toMatchObject({ deliveryStatus: 'PENDING' });
    expect(byId.get(sendingTurnId)).toMatchObject({ deliveryStatus: 'PROCESSING' });
    expect(byId.get(sentTurnId)).toMatchObject({ deliveryStatus: 'DELIVERED' });
    expect(byId.get(retryableTurnId)).toMatchObject({ deliveryStatus: 'PROCESSING' });
    expect(byId.get(terminalTurnId)).toMatchObject({ deliveryStatus: 'FAILED' });
    // No delivery row yet (or purged) — explicit UNKNOWN (Phase 32), never a guessed value.
    expect(byId.get(noDeliveryTurnId)).toMatchObject({ deliveryStatus: 'UNKNOWN' });

    const body = JSON.stringify(detail);
    expect(body).not.toMatch(/chat-secret-id|reply text that must never leak|externalChatId|externalSenderId|callbackQueryId/);
  });

  it('flips a TELEGRAM turn from DELIVERED to UNKNOWN once its delivery row is retention-purged (Phase 32)', async () => {
    const owner = await user('delivery-retention');
    const turn = await service().beginTurn({ userId: owner, correlationId: `corr-tg-retained-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'USER_PROVIDED' });
    await db().assistantTurn.update({ where: { id: turn.turnId }, data: { channel: 'TELEGRAM' } });
    const job = await db().channelInboundJob.create({ data: {
      provider: 'TELEGRAM', externalUpdateId: `upd-retained-${turn.turnId}`, externalSenderId: 'sender', externalChatId: 'chat',
      text: 'safe', status: 'SUCCEEDED', assistantTurnId: turn.turnId,
    } });
    await db().channelOutboundDelivery.create({ data: {
      inboundJobId: job.id, provider: 'TELEGRAM', kind: 'SEND_MESSAGE', destinationChatId: 'chat', renderedText: 'reply', status: 'SENT',
    } });

    const whileRetained = await service().getOwnedConversation(owner, turn.conversationId);
    expect(whileRetained.turns[0]).toMatchObject({ deliveryStatus: 'DELIVERED' });

    // Simulates src/channels/retention.ts's cleanupChannelRecords deleting the
    // now-old SENT delivery and its SUCCEEDED job — retention policy itself
    // is not exercised or changed here, only its downstream read-path effect.
    await db().channelOutboundDelivery.deleteMany({ where: { inboundJobId: job.id } });
    await db().channelInboundJob.delete({ where: { id: job.id } });

    const afterPurge = await service().getOwnedConversation(owner, turn.conversationId);
    expect(afterPurge.turns[0]).toMatchObject({ deliveryStatus: 'UNKNOWN', channel: 'TELEGRAM' });
  });

  // Phase 37.2 — same TOCTOU bug class as the Phase 37.1 wallet-alias-delete
  // race: a concurrent delete can slip in between an owned()/findFirst check
  // and the later write. Each test races the real mutation against a real
  // concurrent delete of the SAME conversation. Correct outcome: exactly one
  // call succeeds, the other rejects with the typed 404 — never a raw/
  // unhandled Prisma error (no 500).
  describe('Phase 37.2 — concurrent delete races', () => {
    it('two concurrent deletes of the same conversation: one succeeds, one 404s, never a raw error', async () => {
      const owner = await user('race-delete-delete');
      const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });

      const results = await Promise.allSettled([
        service().deleteOwnedConversation(owner, turn.conversationId),
        service().deleteOwnedConversation(owner, turn.conversationId),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND', statusCode: 404, isOperational: true });

      const remaining = await db().assistantConversation.findMany({ where: { id: turn.conversationId } });
      expect(remaining).toHaveLength(0);
    });

    it('archive racing a concurrent delete: one succeeds, the other 404s, never a raw error', async () => {
      const owner = await user('race-archive-delete');
      const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });

      const results = await Promise.allSettled([
        service().deleteOwnedConversation(owner, turn.conversationId),
        service().archiveOwnedConversation(owner, turn.conversationId),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND', statusCode: 404, isOperational: true });
    });

    it('restore racing a concurrent delete: one succeeds, the other 404s, never a raw error', async () => {
      const owner = await user('race-restore-delete');
      const turn = await service().beginTurn({ userId: owner, correlationId: `corr-${Date.now()}`, intent: 'x', locale: 'id-ID', content: 'safe', source: 'SAFE_REQUEST_SUMMARY' });
      await service().archiveOwnedConversation(owner, turn.conversationId);

      const results = await Promise.allSettled([
        service().deleteOwnedConversation(owner, turn.conversationId),
        service().restoreOwnedConversation(owner, turn.conversationId),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND', statusCode: 404, isOperational: true });
    });
  });
});
