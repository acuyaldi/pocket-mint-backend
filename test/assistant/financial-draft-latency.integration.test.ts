import { afterAll, afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { PoolClient } from 'pg';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantConversationService } from '../../src/assistant/conversation.service';
import { createAssistantApplicationService } from '../../src/assistant/application.service';
import { CONFIRM_TRANSACTION_OPTIONS, createAssistantFinancialDraftService } from '../../src/assistant/financial-draft.service';
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

// Simulates a far-away pooler (Jakarta → ap-southeast-2): every statement is
// preceded by a server-side `pg_sleep` queued on the SAME connection, so the
// latency happens while the transaction is open — and a ROLLBACK Prisma issues
// on timeout queues behind the in-flight statement exactly as it would in prod
// (a client-side sleep would instead let the delayed statement run after the
// rollback, outside any transaction).
const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 4 }) : undefined;
const latency = { perQueryMs: 0, slowPattern: undefined as RegExp | undefined, slowMs: 0, log: undefined as string[] | undefined };
const patched = new WeakSet<PoolClient>();
resources?.pool.on('connect', (client) => {
  if (patched.has(client)) return;
  patched.add(client);
  const original = client.query.bind(client) as (...args: unknown[]) => Promise<unknown>;
  (client as { query: unknown }).query = (...args: unknown[]) => {
    const text = typeof args[0] === 'string' ? args[0] : (args[0] as { text?: string })?.text ?? '';
    if (typeof args[args.length - 1] === 'function' || text.startsWith('SELECT pg_sleep')) return original(...args);
    latency.log?.push(text);
    const delayMs = (latency.slowPattern?.test(text) ? latency.slowMs : 0) + latency.perQueryMs;
    if (delayMs === 0) return original(...args);
    const sleep = original(`SELECT pg_sleep(${delayMs / 1000})`);
    const actual = original(...args);
    return sleep.then(() => actual, (error) => { actual.catch(() => undefined); throw error; });
  };
});
const users: string[] = [];
afterAll(() => resources?.close());
afterEach(async () => {
  Object.assign(latency, { perQueryMs: 0, slowPattern: undefined, slowMs: 0, log: undefined });
  if (resources && users.length) await resources.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
});

describe.skipIf(!url)('Assistant draft confirm under pooler latency (disposable PostgreSQL)', () => {
  async function fixture(label: string) {
    const user = await resources!.prisma.user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
    users.push(user.id);
    const wallet = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 100000 } });
    const category = await resources!.prisma.category.create({ data: { userId: user.id, name: 'Food', type: 'EXPENSE', icon: 'food', color: '#000000' } });
    return { user, wallet, category };
  }
  function app() {
    const conversations = createAssistantConversationService(resources!.prisma);
    const clarification = createClarificationService(resources!.prisma);
    const entityResolverRegistry = new EntityResolverRegistry();
    entityResolverRegistry.register(createWalletResolver(resources!.prisma));
    entityResolverRegistry.register(createMerchantResolver(resources!.prisma));
    entityResolverRegistry.register(createCategoryResolver(resources!.prisma));
    entityResolverRegistry.finalize();
    const entityResolution = createEntityResolutionService(entityResolverRegistry);
    let application: ReturnType<typeof createAssistantApplicationService>;
    const drafts = createAssistantFinancialDraftService(resources!.prisma, createTransactionService(resources!.prisma), () => ({ inferCategoryId: application.inferCategoryId }));
    const registry = new ToolRegistry(); registry.register(monthlySpendingSummary); registry.register(transactionCreate);
    application = createAssistantApplicationService({ conversations, toolRegistry: registry, handlerRegistry: new Map(), financialDrafts: drafts, clarification, entityResolution });
    const controllers = createAssistantControllers(application, conversations, drafts);
    const server = express(); server.use(express.json()); server.use(correlationMiddleware);
    server.use((req, _res, next) => { (req as any).auth = { userId: req.header('x-test-user') }; next(); });
    server.post('/execute', controllers.execute); server.post('/drafts/:draftId/confirm', controllers.confirmDraft);
    server.post('/conversations/:conversationId/clarifications/:clarificationId/select', controllers.selectClarification);
    server.use(errorHandler); return server;
  }
  async function pendingDraft(server: express.Express, userId: string, walletId: string, categoryId: string): Promise<string> {
    const prepared = await request(server).post('/execute').set('x-test-user', userId)
      .send({ intent: 'transaction.create', arguments: { type: 'EXPENSE', amount: '12500', walletId, categoryId, date: '2026-07-22', description: 'Lunch' } });
    expect(prepared.status).toBe(200);
    return prepared.body.data.data.draftId;
  }
  const confirm = (server: express.Express, userId: string, draftId: string, key: string) =>
    request(server).post(`/drafts/${draftId}/confirm`).set('x-test-user', userId).set('Idempotency-Key', key);

  it('commits a confirm whose round-trips exceed the 5s Prisma default but fit the confirm timeout', async () => {
    const { user, wallet, category } = await fixture('latency-ok'); const server = app();
    const draftId = await pendingDraft(server, user.id, wallet.id, category.id);
    Object.assign(latency, { perQueryMs: 350, log: [] });
    const started = Date.now();
    const res = await confirm(server, user.id, draftId, 'latency-ok-key');
    const elapsed = Date.now() - started;
    const statements = latency.log!.splice(0);
    latency.perQueryMs = 0;

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'COMMITTED' });
    expect(elapsed).toBeGreaterThan(5000);
    expect(elapsed).toBeLessThan(CONFIRM_TRANSACTION_OPTIONS.timeout);
    // Round-trip budget for the EXPENSE happy path, BEGIN … COMMIT inclusive
    // (was 22 before the RUNNING→SUCCEEDED, idempotency and include trims).
    // Raise only on purpose: each one costs a pooler RTT inside the lock.
    expect(statements.length).toBeLessThanOrEqual(16);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } })).balance.toString()).toBe('87500');
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
  }, 30_000);

  it('a P2028 timeout leaves the draft PENDING with nothing written, answers a retryable 503, and the same key then commits once', async () => {
    const { user, wallet, category } = await fixture('latency-timeout'); const server = app();
    const draftId = await pendingDraft(server, user.id, wallet.id, category.id);
    // Stall the draft-claim UPDATE — it runs after the transaction INSERT and
    // the wallet balance UPDATE, so a partial commit would be visible below.
    Object.assign(latency, { slowPattern: /^UPDATE "public"\."assistant_financial_drafts"/, slowMs: CONFIRM_TRANSACTION_OPTIONS.timeout + 1000 });
    const timedOut = await confirm(server, user.id, draftId, 'latency-timeout-key');
    latency.slowPattern = undefined;

    expect(timedOut.status).toBe(503);
    expect(timedOut.body.error.code).toBe('ASSISTANT_TRANSACTION_TIMEOUT');
    const draft = await resources!.prisma.assistantFinancialDraft.findUniqueOrThrow({ where: { id: draftId } });
    expect(draft).toMatchObject({ status: 'PENDING_CONFIRMATION', transactionId: null, failedAt: null });
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(0);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } })).balance.toString()).toBe('100000');
    expect(await resources!.prisma.assistantIdempotencyRecord.count({ where: { userId: user.id } })).toBe(0);
    expect(await resources!.prisma.assistantTurn.count({ where: { conversationId: draft.conversationId, intent: 'transaction.create.confirm' } })).toBe(0);

    const retried = await confirm(server, user.id, draftId, 'latency-timeout-key');
    expect(retried.status).toBe(200);
    expect(retried.body.data).toMatchObject({ status: 'COMMITTED' });
    const replay = await confirm(server, user.id, draftId, 'latency-timeout-key');
    expect(replay.body.data.transactionId).toBe(retried.body.data.transactionId);
    expect(await resources!.prisma.transaction.count({ where: { userId: user.id } })).toBe(1);
    expect((await resources!.prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } })).balance.toString()).toBe('87500');
  }, 60_000);

  it('a P2028 on clarification select answers a retryable 503 and leaves the clarification PENDING and reusable', async () => {
    const { user, category } = await fixture('latency-clarification');
    await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'BCA Debit', type: 'BANK', balance: 500000 } });
    await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'BCA Payroll', type: 'BANK', balance: 500000 } });
    const server = app();
    const asked = await request(server).post('/execute').set('x-test-user', user.id)
      .send({ intent: 'transaction.create', arguments: { type: 'EXPENSE', amount: '50000', walletReference: 'BCA', categoryId: category.id, date: '2026-07-24' } });
    const { conversationId, data: { clarification: clar } } = asked.body.error;
    expect(asked.body.error.status).toBe('clarification_required');
    const select = () => request(server).post(`/conversations/${conversationId}/clarifications/${clar.clarificationId}/select`)
      .set('x-test-user', user.id).send({ optionToken: clar.options[0].token });

    // Stall the claim UPDATE past Prisma's default 5000 ms interactive timeout
    // (the clarification transaction keeps the default on purpose).
    Object.assign(latency, { slowPattern: /^UPDATE "public"\."clarification_requests"/, slowMs: 6000 });
    const timedOut = await select();
    latency.slowPattern = undefined;

    expect(timedOut.status).toBe(503);
    expect(timedOut.body.error.code).toBe('ASSISTANT_TRANSACTION_TIMEOUT');
    expect(await resources!.prisma.clarificationRequest.findUniqueOrThrow({ where: { id: clar.clarificationId } })).toMatchObject({ status: 'PENDING' });
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(0);

    const retried = await select();
    expect(retried.status).toBe(200);
    expect(await resources!.prisma.clarificationRequest.findUniqueOrThrow({ where: { id: clar.clarificationId } })).toMatchObject({ status: 'CONSUMED' });
  }, 30_000);
});
