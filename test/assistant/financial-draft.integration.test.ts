import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantConversationService } from '../../src/assistant/conversation.service';
import { createAssistantApplicationService } from '../../src/assistant/application.service';
import { createAssistantFinancialDraftService } from '../../src/assistant/financial-draft.service';
import { createClarificationService } from '../../src/assistant/clarification.service';
import {
  EntityResolverRegistry,
  createCategoryResolver,
  createEntityResolutionService,
  createMerchantResolver,
  createWalletResolver,
} from '../../src/assistant/entity-resolution';
import { createTransactionService } from '../../src/services/transaction.service';
import { ToolRegistry } from '../../src/assistant/registry';
import { monthlySpendingSummary, transactionCreate } from '../../src/assistant/tools';
import { createAssistantControllers } from '../../src/controllers/assistant.controller';
import { correlationMiddleware } from '../../src/http/correlation';
import { errorHandler } from '../../src/middlewares/error.middleware';
import { reportingConfig } from '../../src/config';
import { formatReportingDate } from '../../src/domain/reportingTime';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 12 }) : undefined;
const users: string[] = [];
afterAll(() => resources?.close());
afterEach(async () => { if (resources && users.length) await resources.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } }); });

describe.skipIf(!url)('Assistant financial drafts (disposable PostgreSQL)', () => {
  async function fixture(label: string) {
    const user = await resources!.prisma.user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
    users.push(user.id);
    const wallet = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 100000 } });
    const category = await resources!.prisma.category.create({ data: { userId: user.id, name: 'Food', type: 'EXPENSE', icon: 'food', color: '#000000' } });
    return { user, wallet, category };
  }
  function categoryFor(userId: string, name: string, type: 'INCOME' | 'EXPENSE') {
    return resources!.prisma.category.create({
      data: { userId, name, type, icon: 'test', color: '#000000' },
    });
  }
  function app(clock?: () => Date) {
    const conversations = createAssistantConversationService(resources!.prisma);
    const clarification = createClarificationService(resources!.prisma);
    const entityResolverRegistry = new EntityResolverRegistry();
    entityResolverRegistry.register(createWalletResolver(resources!.prisma));
    entityResolverRegistry.register(createMerchantResolver(resources!.prisma));
    entityResolverRegistry.register(createCategoryResolver(resources!.prisma));
    entityResolverRegistry.finalize();
    const entityResolution = createEntityResolutionService(entityResolverRegistry);
    // Lazy wiring mirrors src/assistant/bootstrap.ts: `financialDrafts` needs
    // `application.inferCategoryId` (for description-triggered re-inference on
    // confirm) but `application` also needs `financialDrafts` — break the
    // circular dependency with a deferred getter.
    let application: ReturnType<typeof createAssistantApplicationService>;
    const drafts = createAssistantFinancialDraftService(resources!.prisma, createTransactionService(resources!.prisma), () => ({ inferCategoryId: application.inferCategoryId }), clock);
    const registry = new ToolRegistry(); registry.register(monthlySpendingSummary); registry.register(transactionCreate);
    application = createAssistantApplicationService({ conversations, toolRegistry: registry, handlerRegistry: new Map(), financialDrafts: drafts, clarification, entityResolution });
    const controllers = createAssistantControllers(application, conversations, drafts);
    const server = express(); server.use(express.json()); server.use(correlationMiddleware);
    server.use((req, _res, next) => { (req as any).auth = { userId: req.header('x-test-user') }; next(); });
    server.post('/execute', controllers.execute); server.post('/drafts/:draftId/confirm', controllers.confirmDraft);
    server.post('/drafts/:draftId/cancel', controllers.cancelDraft); server.get('/conversations/:conversationId', controllers.get);
    server.get('/conversations/:conversationId/recovery-state', controllers.recoveryState);
    server.use(errorHandler); return server;
  }
  const draftBody = (walletId: string, categoryId: string) => ({ intent: 'transaction.create', arguments: { type: 'EXPENSE', amount: '12500.50', walletId, categoryId, date: '2026-07-22', description: 'Lunch' } });

  it('creates only a pending draft, then confirms once and replays the durable result', async () => {
    const { user, wallet, category } = await fixture('flow'); const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    expect(prepared.status).toBe(200); expect(prepared.body.data.data).toMatchObject({ status: 'PENDING_CONFIRMATION', confirmationRequired: true });
    expect(prepared.body.data.data.preview).toMatchObject({ category: 'Food', categoryId: category.id, transactionDate: '2026-07-22' });
    expect(prepared.body.data.data.renderedText).toContain('kategori Food');
    expect(prepared.body.data.data.renderedText).not.toContain(category.id);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } })).balance.toString()).toBe('100000');
    const draftId = prepared.body.data.data.draftId;
    const first = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'flow-key');
    const replay = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'flow-key');
    const different = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'another-key');
    expect(first.status).toBe(200); expect(replay.status).toBe(200); expect(different.status).toBe(200);
    expect(first.body.data.transactionId).toBe(replay.body.data.transactionId);
    expect(first.body.data).not.toHaveProperty('idempotencyOutcome');
    expect(replay.body.data).not.toHaveProperty('idempotencyOutcome');
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } })).balance.toString()).toBe('87499.5');
    const history = await request(server).get(`/conversations/${prepared.body.data.conversationId}`).set('x-test-user', user.id);
    expect(history.body.data.turns).toHaveLength(2);
    expect(JSON.stringify(history.body.data.turns)).not.toContain('12500.50');
  });

  it.each([
    ['cross-owner', async () => {
      const owner = await fixture('category-owner');
      const other = await fixture('category-other');
      return {
        userId: owner.user.id,
        walletId: owner.wallet.id,
        categoryId: other.category.id,
      };
    }],
    ['opposite-type', async () => {
      const owner = await fixture('category-type');
      const income = await categoryFor(owner.user.id, 'Salary', 'INCOME');
      return {
        userId: owner.user.id,
        walletId: owner.wallet.id,
        categoryId: income.id,
      };
    }],
  ])('rejects %s compatibility categoryId without creating a draft', async (_label, arrange) => {
    const input = await arrange();

    const response = await request(app())
      .post('/execute')
      .set('x-test-user', input.userId)
      .send(draftBody(input.walletId, input.categoryId));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ASSISTANT_DRAFT_NOT_FOUND');
    expect(await resources!.prisma.assistantFinancialDraft.count({
      where: { userId: input.userId },
    })).toBe(0);
    expect(await resources!.prisma.transaction.count({
      where: { userId: input.userId },
    })).toBe(0);
  });

  it('serializes concurrent confirmations to exactly one transaction', async () => {
    const { user, wallet, category } = await fixture('concurrent'); const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const responses = await Promise.all(Array.from({ length: 6 }, (_, index) => request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', `concurrent-${index}`)));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
  });

  it('replays six concurrent confirmations using the same key', async () => {
    const { user, wallet, category } = await fixture('concurrent-same-key'); const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const responses = await Promise.all(Array.from({ length: 6 }, () => request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'one-concurrent-key')));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(new Set(responses.map((response) => response.body.data.transactionId)).size).toBe(1);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
  });

  it('binds one concurrently reused key to at most one of two drafts', async () => {
    const { user, wallet, category } = await fixture('concurrent-cross-draft'); const server = app();
    const [first, second] = await Promise.all([
      request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id)),
      request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id)),
    ]);
    const responses = await Promise.all([first, second].map((prepared) => request(server).post(`/drafts/${prepared.body.data.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'cross-draft-key')));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id, status: 'PENDING_CONFIRMATION' } })).toBe(1);
  });

  it.each([
    ['one millisecond before expiry', -1, 200, 'COMMITTED'],
    ['exactly at expiry', 0, 409, 'EXPIRED'],
    ['one millisecond after expiry', 1, 409, 'EXPIRED'],
  ])('enforces expiry %s using the server clock', async (_label, offsetMs, expectedHttp, expectedStatus) => {
    const { user, wallet, category } = await fixture(`expiry-${offsetMs}`);
    const prepared = await request(app()).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const draft = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
    const server = app(() => new Date(draft.expiresAt.getTime() + offsetMs));
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', `expiry-${offsetMs}`);
    expect(response.status).toBe(expectedHttp);
    expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe(expectedStatus);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(offsetMs < 0 ? 1 : 0);
  });

  it('prevents deleting the authoritative transaction behind a committed draft', async () => {
    const { user, wallet, category } = await fixture('delete-restrict'); const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const confirmed = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'delete-restrict-key');
    await expect(resources!.prisma.transaction.delete({ where: { id: confirmed.body.data.transactionId } })).rejects.toMatchObject({ cause: { code: '23001' } });
  });

  it('rejects cross-user confirmation without revealing ownership', async () => {
    const owner = await fixture('owner'); const other = await fixture('other'); const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', owner.user.id).send(draftBody(owner.wallet.id, owner.category.id));
    const response = await request(server).post(`/drafts/${prepared.body.data.data.draftId}/confirm`).set('x-test-user', other.user.id).set('Idempotency-Key', 'foreign-key');
    expect(response.status).toBe(404); expect(response.body.error.code).toBe('ASSISTANT_DRAFT_NOT_FOUND');
  });

  it('cancels idempotently and never permits a commit afterward', async () => {
    const { user, wallet, category } = await fixture('cancel'); const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    expect((await request(server).post(`/drafts/${draftId}/cancel`).set('x-test-user', user.id)).status).toBe(200);
    expect((await request(server).post(`/drafts/${draftId}/cancel`).set('x-test-user', user.id)).status).toBe(200);
    expect((await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'cancelled-key')).status).toBe(409);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });

  it('rejects idempotency-key reuse across drafts and expires stale drafts on confirmation', async () => {
    const { user, wallet, category } = await fixture('key-expiry'); const server = app();
    const first = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const second = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    await request(server).post(`/drafts/${first.body.data.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'shared-key');
    const conflict = await request(server).post(`/drafts/${second.body.data.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'shared-key');
    expect(conflict.status).toBe(409); expect(conflict.body.error.code).toBe('ASSISTANT_IDEMPOTENCY_CONFLICT');
    await resources!.prisma.assistantFinancialDraft.update({ where: { id: second.body.data.data.draftId }, data: { expiresAt: new Date(0) } });
    const expired = await request(server).post(`/drafts/${second.body.data.data.draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'fresh-key');
    expect(expired.status).toBe(409);
    expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: second.body.data.data.draftId } })).status).toBe('EXPIRED');
  });

  it('does not allow a committed draft to be cancelled', async () => {
    const { user, wallet, category } = await fixture('committed-cancel'); const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'commit-key');
    expect((await request(server).post(`/drafts/${draftId}/cancel`).set('x-test-user', user.id)).status).toBe(409);
  });

  it('records a failed terminal lifecycle when the transaction domain rejects commit', async () => {
    const { user, wallet, category } = await fixture('domain-failure'); const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    await resources!.prisma.category.update({ where: { id: category.id }, data: { type: 'INCOME' } });
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'domain-failure-key');
    expect(response.status).toBe(400);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('FAILED');
    const turns = await resources!.prisma.assistantTurn.findMany({ where: { conversationId: prepared.body.data.conversationId }, include: { toolExecutions: true } });
    expect(turns).toHaveLength(2); expect(turns[1].status).toBe('FAILED'); expect(turns[1].toolExecutions[0].outputSummary).toEqual({ draftId, status: 'FAILED' });
  });

  it('rejects confirmation without mutation when the Category is deleted after drafting', async () => {
    const { user, wallet, category } = await fixture('deleted-category');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id)
      .send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    await resources!.prisma.category.delete({ where: { id: category.id } });

    const response = await request(server).post(`/drafts/${draftId}/confirm`)
      .set('x-test-user', user.id)
      .set('Idempotency-Key', 'deleted-category-key');

    expect(response.status).toBe(404);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
    })).balance.toString()).toBe('100000');
    expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({
      where: { id: draftId },
    })).status).toBe('FAILED');
  });

  it('logs idempotency outcome and error category without exposing keys, amounts, or entity names', async () => {
    const { user, wallet, category } = await fixture('observability'); const server = app();
    // AssistantError-driven 4xx responses are structurally "operational" (see
    // src/http/forwardError.ts), so they're rendered via `sendError` directly —
    // `error.middleware.ts` (and its console.error logging) is bypassed. The
    // controller's own logEvent call is the only place these get logged, at 'warn'.
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;
      const other = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const otherDraftId = other.body.data.data.draftId;
      await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'observability-key');
      await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'observability-key');
      const conflict = await request(server).post(`/drafts/${otherDraftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'observability-key');
      expect(conflict.status).toBe(409);

      const infoLines = infoSpy.mock.calls.map((call) => call[0] as string);
      const warnLines = warnSpy.mock.calls.map((call) => call[0] as string);
      const confirmedEvents = infoLines.filter((line) => line.includes('"assistant.draft.confirmed"'));
      expect(confirmedEvents.some((line) => line.includes('"idempotencyOutcome":"new"'))).toBe(true);
      expect(confirmedEvents.some((line) => line.includes('"idempotencyOutcome":"replay"'))).toBe(true);
      expect(warnLines.some((line) => line.includes('"assistant.draft.confirmed"') && line.includes('"errorCategory":"idempotency"'))).toBe(true);

      const allLines = [...infoLines, ...warnLines];
      for (const line of allLines) {
        expect(line).not.toContain('observability-key');
        expect(line).not.toContain('12500.50');
        expect(line).not.toContain(wallet.id);
        expect(line).not.toContain(category.id);
        expect(line).not.toContain('Lunch');
      }
    } finally {
      infoSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('categorizes an expired confirmation attempt without exposing draft content', async () => {
    const { user, wallet, category } = await fixture('observability-expiry');
    const prepared = await request(app()).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const draft = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
    const server = app(() => new Date(draft.expiresAt.getTime() + 1));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'expiry-observability-key');
      expect(response.status).toBe(409);
      const lines = warnSpy.mock.calls.map((call) => call[0] as string);
      expect(lines.some((line) => line.includes('"assistant.draft.confirmed"') && line.includes('"errorCategory":"expired"'))).toBe(true);
      for (const line of lines) expect(line).not.toContain('expiry-observability-key');
    } finally {
      warnSpy.mockRestore();
    }
  });

  // ---- Confirm-time overrides (Phase 34) -------------------------------------

  it.each([
    ['amount', (w: string, c: string) => ({ amount: 999.25 }), (t: { amount: { toString(): string } }) => expect(t.amount.toString()).toBe('999.25')],
    ['date', (w: string, c: string) => ({ date: '2026-08-01' }), (t: { date: Date }) => expect(formatReportingDate(t.date, reportingConfig.timezone)).toBe('2026-08-01')],
    ['description', (w: string, c: string) => ({ description: 'Overridden note' }), (t: { description: string | null }) => expect(t.description).toBe('Overridden note')],
  ] as const)('applies a confirm-time %s override independently of the draft', async (_label, buildOverride, assertTransaction) => {
    const { user, wallet, category } = await fixture(`override-${_label}`);
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', `override-${_label}-key`).send(buildOverride(wallet.id, category.id));
    expect(response.status).toBe(200);
    const transaction = await resources!.prisma.transaction.findUniqueOrThrow({ where: { id: response.body.data.transactionId } });
    assertTransaction(transaction as never);
  });

  it('applies a confirm-time walletId override and debits the overridden wallet, not the draft wallet', async () => {
    const { user, wallet, category } = await fixture('override-wallet');
    const otherWallet = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Bank', type: 'BANK', balance: 50000 } });
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-wallet-key').send({ walletId: otherWallet.id });
    expect(response.status).toBe(200);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } })).balance.toString()).toBe('100000');
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: otherWallet.id } })).balance.toString()).toBe('37499.5');
  });

  it('applies a confirm-time categoryId override without triggering re-inference', async () => {
    const { user, wallet, category } = await fixture('override-category');
    const otherCategory = await categoryFor(user.id, 'Transport', 'EXPENSE');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-category-key').send({ categoryId: otherCategory.id });
    expect(response.status).toBe(200);
    expect((await resources!.prisma.transaction.findUniqueOrThrow({ where: { id: response.body.data.transactionId } })).categoryId).toBe(otherCategory.id);
  });

  it('applies a combination of overrides atomically in one confirm call', async () => {
    const { user, wallet, category } = await fixture('override-combo');
    const otherWallet = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Bank', type: 'BANK', balance: 50000 } });
    const otherCategory = await categoryFor(user.id, 'Transport', 'EXPENSE');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-combo-key').send({
      amount: 42.5, walletId: otherWallet.id, categoryId: otherCategory.id, date: '2026-09-09', description: 'Combo',
    });
    expect(response.status).toBe(200);
    const transaction = await resources!.prisma.transaction.findUniqueOrThrow({ where: { id: response.body.data.transactionId } });
    expect(transaction.amount.toString()).toBe('42.5');
    expect(transaction.walletId).toBe(otherWallet.id);
    expect(transaction.categoryId).toBe(otherCategory.id);
    expect(formatReportingDate(transaction.date, reportingConfig.timezone)).toBe('2026-09-09');
    expect(transaction.description).toBe('Combo');
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } })).balance.toString()).toBe('100000');
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: otherWallet.id } })).balance.toString()).toBe('49957.5');
  });

  it.each([
    ['walletId', async (user: { id: string }) => { const foreign = await fixture('override-foreign-wallet-owner'); return { walletId: foreign.wallet.id }; }],
    ['categoryId', async (user: { id: string }) => { const foreign = await fixture('override-foreign-category-owner'); return { categoryId: foreign.category.id }; }],
  ] as const)('rejects a foreign %s override without mutating the wallet or creating a transaction', async (_label, buildOverride) => {
    const { user, wallet, category } = await fixture(`override-foreign-${_label}`);
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const override = await buildOverride(user);
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', `override-foreign-${_label}-key`).send(override);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ASSISTANT_DRAFT_NOT_FOUND');
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } })).balance.toString()).toBe('100000');
    expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('PENDING_CONFIRMATION');
  });

  it('re-infers the category when description changes and categoryId is not overridden', async () => {
    const { user, wallet, category } = await fixture('override-reinfer');
    const catchAll = await categoryFor(user.id, 'Lainnya', 'EXPENSE');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-reinfer-key').send({ description: 'Something entirely different' });
    expect(response.status).toBe(200);
    const transaction = await resources!.prisma.transaction.findUniqueOrThrow({ where: { id: response.body.data.transactionId } });
    expect(transaction.categoryId).toBe(catchAll.id);
    expect(transaction.categoryId).not.toBe(category.id);
  });

  it('serializes concurrent confirmations carrying different override payloads to exactly one commit', async () => {
    const { user, wallet, category } = await fixture('override-concurrent');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const responses = await Promise.all(Array.from({ length: 5 }, (_, index) => request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', `override-concurrent-${index}`).send({ amount: 100 + index })));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
    expect(new Set(responses.map((response) => response.body.data.transactionId)).size).toBe(1);
    const transaction = await resources!.prisma.transaction.findFirstOrThrow({ where: { userId: user.id } });
    expect([100, 101, 102, 103, 104]).toContain(Number(transaction.amount.toString()));
  });

  it('ignores overrides against an expired draft — expiry remains authoritative', async () => {
    const { user, wallet, category } = await fixture('override-expired');
    const prepared = await request(app()).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const draft = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
    const server = app(() => new Date(draft.expiresAt.getTime() + 1));
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-expired-key').send({ amount: 1 });
    expect(response.status).toBe(409);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });

  it('ignores overrides against a cancelled draft — cancellation remains authoritative', async () => {
    const { user, wallet, category } = await fixture('override-cancelled');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    await request(server).post(`/drafts/${draftId}/cancel`).set('x-test-user', user.id);
    const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-cancelled-key').send({ amount: 1 });
    expect(response.status).toBe(409);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
  });

  it('ignores overrides replayed against an already-committed draft — the original commit remains authoritative', async () => {
    const { user, wallet, category } = await fixture('override-committed');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const draftId = prepared.body.data.data.draftId;
    const first = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-committed-key');
    const replay = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'override-committed-replay-key').send({ amount: 1 });
    expect(replay.status).toBe(200);
    expect(replay.body.data.transactionId).toBe(first.body.data.transactionId);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
    expect((await resources!.prisma.transaction.findUniqueOrThrow({ where: { id: first.body.data.transactionId } })).amount.toString()).toBe('12500.5');
  });

  it('exposes categoryId and an unambiguous ISO transactionDate in the draft preview and recovery projection', async () => {
    const { user, wallet, category } = await fixture('preview-raw-fields');
    const server = app();
    const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    expect(prepared.body.data.data.preview).toMatchObject({ categoryId: category.id, transactionDate: '2026-07-22', category: 'Food', date: '2026-07-22' });

    const recovery = await request(server).get(`/conversations/${prepared.body.data.conversationId}/recovery-state`).set('x-test-user', user.id);
    expect(recovery.status).toBe(200);
    expect(recovery.body.data.pendingDraft.preview).toMatchObject({ categoryId: category.id, transactionDate: '2026-07-22' });
  });

  // ---- Phase 37.3: FAILED/EXPIRED terminal semantics ----------------------

  describe('Phase 37.3 — FAILED is a terminal, never-replayed state', () => {
    it('rejects a confirm retry on a FAILED draft with a response the client can tell apart from an actionable state', async () => {
      const { user, wallet, category } = await fixture('failed-no-replay');
      const server = app();
      const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;
      await resources!.prisma.category.update({ where: { id: category.id }, data: { type: 'INCOME' } });
      const failed = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'failed-no-replay-key');
      expect(failed.status).toBe(400);
      expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('FAILED');

      // A second confirm against the now-FAILED draft — must stay FAILED,
      // never auto-replay the transaction attempt, and the envelope must
      // carry a marker a client can branch on without parsing `message`.
      const retry = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'failed-no-replay-retry-key');
      expect(retry.status).toBe(409);
      expect(retry.body.error.code).toBe('ASSISTANT_DRAFT_CONFLICT');
      expect(retry.body.error.detail).toBe('FAILED');
      expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
      expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('FAILED');
    });

    it('rejects a cancel on a FAILED draft the same way', async () => {
      const { user, wallet, category } = await fixture('failed-no-cancel');
      const server = app();
      const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;
      await resources!.prisma.category.update({ where: { id: category.id }, data: { type: 'INCOME' } });
      await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'failed-no-cancel-key');

      const cancelled = await request(server).post(`/drafts/${draftId}/cancel`).set('x-test-user', user.id);
      expect(cancelled.status).toBe(409);
      expect(cancelled.body.error.detail).toBe('FAILED');
      expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('FAILED');
    });
  });

  describe('Phase 37.3 — EXPIRED conflict carries a distinguishable marker and is race-safe', () => {
    it('an EXPIRED conflict response carries error.detail distinct from FAILED/CANCELLED/COMMITTED', async () => {
      const { user, wallet, category } = await fixture('expired-detail-marker');
      const prepared = await request(app()).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;
      const draft = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
      const server = app(() => new Date(draft.expiresAt.getTime() + 1));
      const response = await request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'expired-detail-marker-key');
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('ASSISTANT_DRAFT_CONFLICT');
      expect(response.body.error.detail).toBe('EXPIRED');
    });

    it('concurrent confirm vs confirm on an already-expired draft: both reject with the EXPIRED conflict, never a transaction, never a 500', async () => {
      const { user, wallet, category } = await fixture('expired-race-confirm-confirm');
      const prepared = await request(app()).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;
      const draft = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
      const server = app(() => new Date(draft.expiresAt.getTime() + 1));

      const responses = await Promise.all([
        request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'expired-race-a'),
        request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'expired-race-b'),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(409);
        expect(response.body.error.detail).toBe('EXPIRED');
      }
      expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
      expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('EXPIRED');
    });

    it('concurrent confirm vs cancel on an already-expired draft: both terminal, never a transaction, never a 500', async () => {
      const { user, wallet, category } = await fixture('expired-race-confirm-cancel');
      const prepared = await request(app()).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;
      const draft = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
      const server = app(() => new Date(draft.expiresAt.getTime() + 1));

      const [confirmRes, cancelRes] = await Promise.all([
        request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'expired-race-cc'),
        request(server).post(`/drafts/${draftId}/cancel`).set('x-test-user', user.id),
      ]);

      expect(confirmRes.status).toBe(409);
      expect([200, 409]).toContain(cancelRes.status); // cancel() returns EXPIRED as a 200 result, not an error, when it wins the race
      expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
      expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('EXPIRED');
    });

    it('a concurrent conversation delete racing the lazy EXPIRED write returns a clean 404, never a raw 500', async () => {
      const { user, wallet, category } = await fixture('expired-race-conversation-delete');
      const prepared = await request(app()).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;
      const conversationId = prepared.body.data.conversationId;
      const draft = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
      const server = app(() => new Date(draft.expiresAt.getTime() + 1));
      const conversations = createAssistantConversationService(resources!.prisma);

      const [deleteResult, confirmResponse] = await Promise.allSettled([
        conversations.deleteOwnedConversation(user.id, conversationId),
        request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', 'expired-race-delete-key'),
      ]);

      // Whichever order they actually land in, the draft (cascade-deleted
      // with its conversation) never ends up COMMITTED, and confirm() never
      // surfaces a raw/unhandled error — only its own typed 404/409.
      expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
      if (confirmResponse.status === 'fulfilled') {
        expect([404, 409]).toContain(confirmResponse.value.status);
      }
      expect(deleteResult.status).toBe('fulfilled');
    });
  });

  describe('Phase 37.3 — abandoned PENDING is excluded from active recovery state', () => {
    it('recovery-state no longer reports a past-TTL PENDING_CONFIRMATION draft as the pending draft', async () => {
      const { user, wallet, category } = await fixture('abandoned-pending-draft');
      const prepared = await request(app()).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;
      // Force the row itself past expiresAt without ever touching it through
      // confirm/cancel — simulates a draft nobody ever acted on again.
      await resources!.prisma.assistantFinancialDraft.update({ where: { id: draftId }, data: { expiresAt: new Date(0) } });

      const server = app();
      const recovery = await request(server).get(`/conversations/${prepared.body.data.conversationId}/recovery-state`).set('x-test-user', user.id);

      expect(recovery.status).toBe(200);
      expect(recovery.body.data.pendingDraft).toBeUndefined();
      // The DB row itself is untouched — lazy expiry only, no sweep.
      expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('PENDING_CONFIRMATION');
    });
  });

  // ---- Phase 37.4: wallet deleted concurrently during confirm ----------

  describe('Phase 37.4 — a concurrent wallet delete during confirm never produces a FAILED draft or a partial transaction', () => {
    it('(a) double confirm in parallel still produces exactly one transaction', async () => {
      const { user, wallet, category } = await fixture('374-double-confirm');
      const server = app();
      const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;

      const responses = await Promise.all([
        request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', '374-double-confirm-a'),
        request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', user.id).set('Idempotency-Key', '374-double-confirm-b'),
      ]);

      expect(responses.every((r) => r.status === 200)).toBe(true);
      expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
      expect(new Set(responses.map((r) => r.body.data.transactionId)).size).toBe(1);
    });

    // (b)/(c) force the real TOCTOU deterministically, the same technique
    // `test/walletAlias/walletAlias.integration.test.ts` uses for the
    // Phase 37.1 race: a naive `Promise.all`/`Promise.allSettled` against a
    // real local Postgres does NOT reliably reproduce it.
    //
    // The specific statement sequence matters: createTransaction resolves
    // `client = options.transaction ?? db` and uses `client` for every
    // query once confirm() calls it with `{ transaction: tx }` — so its own
    // early `wallet.findFirst` ownership check, the `transaction.create`
    // (which has a real FK to the wallet — deleting the wallet beforehand
    // makes THIS fail with P2003, not the P2025 this fix targets), and the
    // later `applyBalanceDeltas` `wallet.update` are all the SAME statement
    // sequence inside the SAME transaction. A genuine P2025 on the update
    // specifically requires the wallet to still exist through
    // `transaction.create` and vanish only after. `racyDbWalletVanishesOnUpdate`
    // forces exactly that: it passes every call straight through to the
    // real transaction client (auto-bound — Prisma delegate methods need
    // their own `this`, same reason the Phase 37.1 test explicitly
    // `.bind()`s), except `wallet.update` on the target wallet, which first
    // deletes that real row (inside this same transaction, right before
    // the call that's supposed to balance it) and then calls the real
    // update — which now genuinely matches zero rows and throws real P2025.
    function racyDbWalletVanishesOnUpdate(walletId: string) {
      return {
        $transaction: (work: (tx: unknown) => Promise<unknown>) =>
          resources!.prisma.$transaction(async (realTx) => {
            const racyWallet = new Proxy(realTx.wallet, {
              get(t, prop) {
                if (prop === 'update') {
                  return async (args: { where: { id: string } }) => {
                    if (args.where.id === walletId) {
                      await realTx.wallet.delete({ where: { id: walletId } });
                    }
                    return realTx.wallet.update(args);
                  };
                }
                const value = (t as unknown as Record<string, unknown>)[prop as string];
                return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
              },
            });
            const wrappedTx = new Proxy(realTx, {
              get(t, prop) {
                if (prop === 'wallet') return racyWallet;
                const value = (t as unknown as Record<string, unknown>)[prop as string];
                return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(t) : value;
              },
            });
            return work(wrappedTx);
          }),
      } as unknown as Parameters<typeof createAssistantFinancialDraftService>[0];
    }

    it('(b) a wallet deleted concurrently during confirm: 409, draft stays PENDING_CONFIRMATION, no partial transaction', async () => {
      const { user, wallet, category } = await fixture('374-wallet-deleted');
      const server = app();
      const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;

      const racyDrafts = createAssistantFinancialDraftService(racyDbWalletVanishesOnUpdate(wallet.id), createTransactionService(resources!.prisma));
      const err = await racyDrafts.confirm(user.id, draftId, '374-wallet-deleted-key', 'corr-374-b').catch((e) => e);

      expect(err).toMatchObject({ statusCode: 409, code: 'WALLET_CONCURRENTLY_MODIFIED', isOperational: true });
      expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
      // The whole confirm transaction rolled back, including the forced
      // delete — the wallet genuinely still exists afterward.
      expect(await resources!.prisma.wallet.findUnique({ where: { id: wallet.id } })).not.toBeNull();
      const draftAfter = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
      expect(draftAfter.status).toBe('PENDING_CONFIRMATION');
      expect(draftAfter.transactionId).toBeNull();
    });

    it('(c) after (b), editing the draft to a different wallet and confirming again succeeds', async () => {
      const { user, wallet, category } = await fixture('374-wallet-deleted-then-edit');
      const server = app();
      const prepared = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
      const draftId = prepared.body.data.data.draftId;

      const racyDrafts = createAssistantFinancialDraftService(racyDbWalletVanishesOnUpdate(wallet.id), createTransactionService(resources!.prisma));
      const failed = await racyDrafts.confirm(user.id, draftId, '374-edit-then-confirm-fail', 'corr-374-c-fail').catch((e) => e);
      expect(failed).toMatchObject({ statusCode: 409, code: 'WALLET_CONCURRENTLY_MODIFIED' });
      expect((await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('PENDING_CONFIRMATION');

      // User edits the draft (Phase 34 override) to point at a new, real
      // wallet and retries — using the NORMAL (non-racy) service, since
      // this step isn't exercising a race, just recovery after one.
      const replacementWallet = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Dompet Baru', type: 'CASH', balance: 100000 } });
      const normalDrafts = createAssistantFinancialDraftService(resources!.prisma, createTransactionService(resources!.prisma));
      const retried = await normalDrafts.confirm(user.id, draftId, '374-edit-then-confirm-ok', 'corr-374-c-ok', { walletId: replacementWallet.id });

      expect(retried.status).toBe('COMMITTED');
      expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
      const committedDraft = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
      expect(committedDraft.status).toBe('COMMITTED');
      const transaction = await resources!.prisma.transaction.findUniqueOrThrow({ where: { id: committedDraft.transactionId! } });
      expect(transaction.walletId).toBe(replacementWallet.id);
    });
  });
});
