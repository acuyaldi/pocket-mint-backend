import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantContextService } from '../../src/assistant/context.service';
import { serializeAssistantContext } from '../../src/assistant/context.serializer';
import { AssistantError } from '../../src/assistant/errors';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 5 }, [{ emit: 'event', level: 'query' }]) : undefined;
const capturedQueries: string[] = [];
let captureQueries = false;
resources?.prisma.$on('query', (event) => {
  if (captureQueries) capturedQueries.push(event.query);
});
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

  async function captureContextQueries<T>(work: () => Promise<T>): Promise<{ result: T; queries: string[] }> {
    capturedQueries.length = 0;
    captureQueries = true;
    try {
      return { result: await work(), queries: [...capturedQueries] };
    } finally {
      captureQueries = false;
    }
  }

  async function captureContextFailure(work: () => Promise<unknown>): Promise<{ error: unknown; queries: string[] }> {
    capturedQueries.length = 0;
    captureQueries = true;
    let error: unknown;
    try {
      await work();
    } catch (caught) {
      error = caught;
    } finally {
      captureQueries = false;
    }
    if (!error) throw new Error('Expected context preparation to fail');
    return { error, queries: [...capturedQueries] };
  }

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

    const firstRun = await captureContextQueries(() => service().buildExecutionContext({ userId: owner, conversationId: row.id, currentRequest: '  Lanjutkan  ' }));
    const secondRun = await captureContextQueries(() => service().buildExecutionContext({ userId: owner, conversationId: row.id, currentRequest: 'Lanjutkan' }));
    const first = firstRun.result;
    const second = secondRun.result;

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
    expect(firstRun.queries, firstRun.queries.join('\n---\n')).toHaveLength(4);
    expect(secondRun.queries).toHaveLength(4);
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

    const run = await captureContextQueries(() => service().buildExecutionContext({ userId: owner, conversationId: row.id, currentRequest: 'Ringkas' }));
    const context = run.result;
    const serialized = serializeAssistantContext(context);

    expect(context).not.toHaveProperty('pendingDraft');
    expect(context.turns.length).toBeLessThanOrEqual(20);
    expect(context.turns.flatMap((turn) => turn.messages)).toHaveLength(30);
    expect(Buffer.byteLength(serialized, 'utf8')).toBeLessThanOrEqual(64 * 1024);
    expect(serialized).toContain('assistant-44');
    expect(serialized).not.toContain('assistant-0');
    expect(run.queries).toHaveLength(4);
  });

  it('uses exactly four SQL reads and changes no Assistant or financial state', async () => {
    const owner = await user('context-queries');
    const row = await conversation(owner);
    await turnWithMessages(row.id, 1);
    const wallet = await db().wallet.create({ data: { userId: owner, name: 'Read-only cash', type: 'CASH', balance: new Prisma.Decimal('99.50') } });
    const before = await Promise.all([
      db().assistantConversation.count(), db().assistantTurn.count(), db().assistantMessage.count(),
      db().assistantFinancialDraft.count(), db().assistantToolExecution.count(), db().assistantIdempotencyRecord.count(), db().transaction.count(),
      db().assistantConversation.findUniqueOrThrow({ where: { id: row.id }, select: { updatedAt: true, lastActivityAt: true } }),
      db().wallet.findUniqueOrThrow({ where: { id: wallet.id }, select: { balance: true } }),
    ]);

    const run = await captureContextQueries(() => service().buildExecutionContext({ userId: owner, conversationId: row.id, currentRequest: 'Read only' }));

    expect(run.queries).toHaveLength(4);
    const after = await Promise.all([
      db().assistantConversation.count(), db().assistantTurn.count(), db().assistantMessage.count(),
      db().assistantFinancialDraft.count(), db().assistantToolExecution.count(), db().assistantIdempotencyRecord.count(), db().transaction.count(),
      db().assistantConversation.findUniqueOrThrow({ where: { id: row.id }, select: { updatedAt: true, lastActivityAt: true } }),
      db().wallet.findUniqueOrThrow({ where: { id: wallet.id }, select: { balance: true } }),
    ]);
    expect(after).toEqual(before);
  });

  it('keeps database state unchanged for cross-user and protected-overflow failures', async () => {
    const owner = await user('context-failure-owner');
    const other = await user('context-failure-other');
    const row = await conversation(owner);
    await turnWithMessages(row.id, 1, 70_000);
    const wallet = await db().wallet.create({ data: { userId: owner, name: 'Failure cash', type: 'CASH', balance: new Prisma.Decimal('77.25') } });
    const snapshot = () => Promise.all([
      db().assistantConversation.count(), db().assistantTurn.count(), db().assistantMessage.count(),
      db().assistantFinancialDraft.count(), db().assistantToolExecution.count(), db().assistantIdempotencyRecord.count(),
      db().transaction.count(),
      db().assistantConversation.findUniqueOrThrow({ where: { id: row.id }, select: { updatedAt: true, lastActivityAt: true } }),
      db().wallet.findUniqueOrThrow({ where: { id: wallet.id }, select: { balance: true } }),
    ]);
    const before = await snapshot();

    const crossUser = await captureContextFailure(() => service().buildExecutionContext({ userId: other, conversationId: row.id, currentRequest: 'Halo' }));
    expect(crossUser.error).toEqual(AssistantError.conversationNotFound());
    expect(crossUser.queries).toHaveLength(1);
    expect(await snapshot()).toEqual(before);

    const overflow = await captureContextFailure(() => service().buildExecutionContext({ userId: owner, conversationId: row.id, currentRequest: 'Halo' }));
    expect(overflow.error).toEqual(AssistantError.contextTooLarge());
    expect(overflow.queries).toHaveLength(4);
    expect(await snapshot()).toEqual(before);
  }, 20_000);
});
