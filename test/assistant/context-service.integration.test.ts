import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantContextService } from '../../src/assistant/context.service';
import { serializeAssistantContext } from '../../src/assistant/context.serializer';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 5 }) : undefined;
const userIds: string[] = [];
afterAll(() => resources?.close());
afterEach(async () => {
  vi.restoreAllMocks();
  if (!resources || !userIds.length) return;
  await resources.prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
});

describe.skipIf(!url)('Assistant context service (disposable PostgreSQL)', () => {
  const db = () => resources!.prisma;
  const service = () => createAssistantContextService(db(), () => new Date('2026-07-23T12:00:00Z'));

  async function user(label: string) {
    const row = await db().user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
    userIds.push(row.id);
    return row.id;
  }

  async function conversation(owner: string, status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
    return db().assistantConversation.create({ data: {
      userId: owner, status, locale: 'id-ID',
      ...(status === 'ARCHIVED' ? { archivedAt: new Date('2026-07-23T11:00:00Z') } : {}),
    } });
  }

  async function turnWithMessages(conversationId: string, index: number, contentSize = 0) {
    const timestamp = new Date(Date.UTC(2026, 6, 23, 0, 0, index));
    const turn = await db().assistantTurn.create({ data: {
      conversationId, correlationId: `context-${conversationId}-${index}`, intent: `intent-${index}`,
      locale: 'id-ID', status: 'SUCCEEDED', startedAt: timestamp, finishedAt: timestamp, createdAt: timestamp,
    } });
    await db().assistantMessage.createMany({ data: [
      { id: `context-user-${conversationId}-${index}`, conversationId, turnId: turn.id, role: 'USER', source: 'USER_PROVIDED', content: `user-${index}${'u'.repeat(contentSize)}`, createdAt: timestamp },
      { id: `context-assistant-${conversationId}-${index}`, conversationId, turnId: turn.id, role: 'ASSISTANT', source: 'DETERMINISTIC_RENDERER', content: `assistant-${index}${'a'.repeat(contentSize)}`, createdAt: timestamp },
    ] });
    return turn;
  }

  it('assembles mixed history, one pending draft, and bounded tool history deterministically', async () => {
    const owner = await user('context-owner');
    const row = await conversation(owner);
    const origin = await turnWithMessages(row.id, 1);
    await turnWithMessages(row.id, 2);
    const wallet = await db().wallet.create({ data: { userId: owner, name: 'Cash', type: 'CASH' } });
    const category = await db().category.create({ data: { userId: owner, name: 'Food', type: 'EXPENSE' } });
    const execution = await db().assistantToolExecution.create({ data: {
      conversationId: row.id, turnId: origin.id, toolId: 'transaction.create', capability: 'transaction.create',
      riskLevel: 'HIGH', policyDecision: 'DRAFT_AND_CONFIRM', status: 'SUCCEEDED', correlationId: `draft-${row.id}`,
      outputSummary: { draftId: 'safe-draft-reference', correlationId: 'hidden', transactionId: 'hidden' },
    } });
    const draft = await db().assistantFinancialDraft.create({ data: {
      userId: owner, conversationId: row.id, originatingTurnId: origin.id, originatingExecutionId: execution.id,
      operation: 'transaction.create', transactionType: 'EXPENSE', amount: new Prisma.Decimal('12500.50'),
      walletId: wallet.id, categoryId: category.id, transactionDate: new Date('2026-07-23T00:00:00Z'),
      description: 'Kopi', expiresAt: new Date('2026-07-23T12:15:00Z'),
    } });
    for (let index = 0; index < 12; index += 1) {
      await db().assistantToolExecution.create({ data: {
        conversationId: row.id, turnId: origin.id, toolId: `tool-${index}`, capability: 'analytics.read',
        riskLevel: 'LOW', policyDecision: 'EXECUTE_IMMEDIATELY', status: 'SUCCEEDED', correlationId: `tool-${row.id}-${index}`,
        startedAt: new Date(Date.UTC(2026, 6, 23, 1, 0, index)), outputSummary: { value: index, policyDecision: 'hidden' },
      } });
    }

    const first = await service().buildExecutionContext({ userId: owner, conversationId: row.id, currentRequest: '  Lanjutkan  ' });
    const second = await service().buildExecutionContext({ userId: owner, conversationId: row.id, currentRequest: 'Lanjutkan' });

    expect(first.pendingDraft).toMatchObject({ draftId: draft.id, operation: 'transaction.create', status: 'PENDING_CONFIRMATION', confirmationRequired: true });
    expect(first.toolExecutions).toHaveLength(10);
    expect(first.toolExecutions.map((tool) => tool.tool)).toEqual([
      ...Array.from({ length: 9 }, (_, index) => `tool-${index + 3}`),
      'transaction.create',
    ]);
    expect(first.turns.flatMap((turn) => turn.messages.map((message) => message.content))).toEqual(['assistant-1', 'user-1', 'assistant-2', 'user-2']);
    expect(first.currentRequest.content).toBe('Lanjutkan');
    expect(serializeAssistantContext(first)).toBe(serializeAssistantContext(second));
    expect(serializeAssistantContext(first)).not.toMatch(/hidden|walletId|categoryId|policyDecision|transactionId/);
  });

  it('makes unknown and cross-user conversations indistinguishable and rejects archived conversations', async () => {
    const owner = await user('context-owner-a');
    const other = await user('context-owner-b');
    const active = await conversation(owner);
    const archived = await conversation(owner, 'ARCHIVED');

    for (const conversationId of [active.id, 'missing']) {
      await expect(service().buildExecutionContext({ userId: other, conversationId, currentRequest: 'Halo' }))
        .rejects.toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND' });
    }
    await expect(service().buildExecutionContext({ userId: owner, conversationId: archived.id, currentRequest: 'Halo' }))
      .rejects.toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_CONTINUABLE' });
  });

  it('trims large histories to configured counts and 64 KB with no pending draft', async () => {
    const owner = await user('context-large');
    const row = await conversation(owner);
    for (let index = 0; index < 45; index += 1) await turnWithMessages(row.id, index, 2_000);

    const context = await service().buildExecutionContext({ userId: owner, conversationId: row.id, currentRequest: 'Ringkas' });
    const serialized = serializeAssistantContext(context);

    expect(context).not.toHaveProperty('pendingDraft');
    expect(context.turns.length).toBeLessThanOrEqual(20);
    expect(context.turns.flatMap((turn) => turn.messages)).toHaveLength(30);
    expect(Buffer.byteLength(serialized, 'utf8')).toBeLessThanOrEqual(64 * 1024);
    expect(serialized).toContain('assistant-44');
    expect(serialized).not.toContain('assistant-0');
  });

  it('uses exactly four bounded Prisma reads and writes no Assistant or financial rows', async () => {
    const owner = await user('context-queries');
    const row = await conversation(owner);
    await turnWithMessages(row.id, 1);
    const before = await Promise.all([
      db().assistantConversation.count(), db().assistantTurn.count(), db().assistantMessage.count(),
      db().assistantFinancialDraft.count(), db().assistantToolExecution.count(), db().assistantIdempotencyRecord.count(), db().transaction.count(),
    ]);
    const reads = [
      vi.spyOn(db().assistantConversation, 'findFirst'),
      vi.spyOn(db().assistantMessage, 'findMany'),
      vi.spyOn(db().assistantFinancialDraft, 'findFirst'),
      vi.spyOn(db().assistantToolExecution, 'findMany'),
    ];

    await service().buildExecutionContext({ userId: owner, conversationId: row.id, currentRequest: 'Read only' });

    expect(reads.map((read) => read.mock.calls.length)).toEqual([1, 1, 1, 1]);
    const after = await Promise.all([
      db().assistantConversation.count(), db().assistantTurn.count(), db().assistantMessage.count(),
      db().assistantFinancialDraft.count(), db().assistantToolExecution.count(), db().assistantIdempotencyRecord.count(), db().transaction.count(),
    ]);
    expect(after).toEqual(before);
  });
});
