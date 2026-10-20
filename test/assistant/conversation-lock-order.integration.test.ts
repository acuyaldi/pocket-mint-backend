import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Server } from 'node:http';
import type { PoolClient } from 'pg';
import { createPrismaResources, type PrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantConversationService } from '../../src/assistant/conversation.service';
import { createAssistantApplicationService } from '../../src/assistant/application.service';
import { createAssistantFinancialDraftService } from '../../src/assistant/financial-draft.service';
import { createClarificationService } from '../../src/assistant/clarification.service';
import { createAssistantContextService } from '../../src/assistant/context.service';
import { createAssistantProviderAuditService } from '../../src/assistant/provider-audit.service';
import { createAssistantProviderRuntime } from '../../src/assistant/provider-runtime';
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
import { handleMonthlySpendingSummary } from '../../src/assistant/handlers/monthly-spending-summary.handler';
import { createAssistantControllers } from '../../src/controllers/assistant.controller';
import { correlationMiddleware } from '../../src/http/correlation';
import { errorHandler } from '../../src/middlewares/error.middleware';

// Phase 38.2 — global lock order: the conversation row first, then the
// clarification / draft / turn / execution rows. deleteOwnedConversation takes
// the conversation row (FOR UPDATE) and then cascades into the children; any
// path that locks a child first and the conversation second can deadlock
// against it. Each race runs on its own pool, closed before reading
// pg_stat_database: a backend flushes its deadlock counter on exit, while an
// idle pooled one may hold it back for up to 10 s.
//
// Latency is a server-side pg_sleep queued on the same connection before every
// write (same technique as financial-draft-latency.integration.test.ts), so the
// delay happens while the transaction holds its locks.

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const main = url ? createPrismaResources(url, { max: 4 }) : undefined;
const ITERATIONS = 100;
const BATCH = 10;
const users: string[] = [];
afterAll(() => main?.close());
afterEach(async () => {
  if (main && users.length) await main.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
});

const WRITE = /^(INSERT|UPDATE|DELETE)/;
function racePool(writeLatencyMs: number): PrismaResources {
  const resources = createPrismaResources(url!, { max: 40 });
  const patched = new WeakSet<PoolClient>();
  resources.pool.on('connect', (client) => {
    if (patched.has(client) || writeLatencyMs === 0) return;
    patched.add(client);
    const original = client.query.bind(client) as (...args: unknown[]) => Promise<unknown>;
    (client as { query: unknown }).query = (...args: unknown[]) => {
      const text = typeof args[0] === 'string' ? args[0] : (args[0] as { text?: string })?.text ?? '';
      if (typeof args[args.length - 1] === 'function' || !WRITE.test(text)) return original(...args);
      const sleep = original(`SELECT pg_sleep(${writeLatencyMs / 1000})`);
      const actual = original(...args);
      return sleep.then(() => actual, (error) => { actual.catch(() => undefined); throw error; });
    };
  });
  return resources;
}

async function deadlocks(): Promise<number> {
  const rows = await main!.prisma.$queryRaw<{ deadlocks: number }[]>`SELECT deadlocks::int AS "deadlocks" FROM pg_stat_database WHERE datname = current_database()`;
  return rows[0]!.deadlocks;
}

/** Runs `race` on a dedicated pool and returns how many deadlocks Postgres recorded meanwhile. */
async function countingDeadlocks(writeLatencyMs: number, race: (resources: PrismaResources) => Promise<void>): Promise<number> {
  const before = await deadlocks();
  const resources = racePool(writeLatencyMs);
  try {
    await race(resources);
  } finally {
    await resources.close();
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (await deadlocks()) - before;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = (maxMs: number) => sleep(Math.floor(Math.random() * maxMs));

/**
 * One listening server per race, bound to 127.0.0.1. supertest(app) and a
 * host-less listen(0) bind `::` (dual-stack), which does not conflict with a
 * foreign 127.0.0.1:<port> listener in the ephemeral range, while supertest
 * dials 127.0.0.1:<port> — the foreign listener answers (stray 401/404/hang
 * up). Binding 127.0.0.1 makes the OS refuse a taken port.
 */
async function listening<T>(server: express.Express, run: (listener: Server) => Promise<T>): Promise<T> {
  const listener = await new Promise<Server>((resolve, reject) => {
    const bound = server.listen(0, '127.0.0.1', () => resolve(bound)).once('error', reject);
  });
  try {
    return await run(listener);
  } finally {
    listener.closeAllConnections();
    await new Promise((resolve) => listener.close(resolve));
  }
}

async function inBatches(count: number, run: (i: number) => Promise<void>): Promise<void> {
  for (let start = 0; start < count; start += BATCH) {
    await Promise.all(Array.from({ length: Math.min(BATCH, count - start) }, (_, k) => run(start + k)));
  }
}

function app(prisma: PrismaResources['prisma']) {
  const conversations = createAssistantConversationService(prisma);
  const clarification = createClarificationService(prisma);
  const resolvers = new EntityResolverRegistry();
  resolvers.register(createWalletResolver(prisma));
  resolvers.register(createMerchantResolver(prisma));
  resolvers.register(createCategoryResolver(prisma));
  resolvers.finalize();
  const registry = new ToolRegistry(); registry.register(monthlySpendingSummary); registry.register(transactionCreate);
  let application: ReturnType<typeof createAssistantApplicationService>;
  const drafts = createAssistantFinancialDraftService(prisma, createTransactionService(prisma), () => ({ inferCategoryId: application.inferCategoryId }));
  application = createAssistantApplicationService({
    conversations, contexts: createAssistantContextService(prisma), toolRegistry: registry,
    handlerRegistry: new Map([[monthlySpendingSummary.id, handleMonthlySpendingSummary as never]]),
    financialDrafts: drafts, clarification, entityResolution: createEntityResolutionService(resolvers),
  });
  const provider = {
    kind: 'gemini' as const, model: 'gemini-test',
    generateStructuredResponse: vi.fn(async () => {
      const output = { kind: 'intent', intent: 'analytics.monthly-spending-summary', arguments: { month: '2026-07' }, clarification: null, userMessage: 'Ringkas Juli' };
      return { output, outputBytes: Buffer.byteLength(JSON.stringify(output), 'utf8'), finishClassification: 'STOP' as const, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 } };
    }),
  };
  const runtime = createAssistantProviderRuntime({
    application, conversations, financialDrafts: drafts, provider,
    audit: createAssistantProviderAuditService(prisma), toolRegistry: registry, timeoutMs: 5000,
  });
  const controllers = createAssistantControllers(application, conversations, drafts, runtime);
  const server = express(); server.use(express.json()); server.use(correlationMiddleware);
  server.use((req, _res, next) => { (req as any).auth = { userId: req.header('x-test-user') }; next(); });
  server.post('/execute', controllers.execute);
  server.post('/messages', controllers.messages);
  server.delete('/conversations/:conversationId', controllers.remove);
  server.post('/conversations/:conversationId/archive', controllers.archive);
  server.post('/conversations/:conversationId/clarifications/:clarificationId/select', controllers.selectClarification);
  server.use(errorHandler);
  return { server, conversations };
}

async function fixture(label: string) {
  const user = await main!.prisma.user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
  users.push(user.id);
  await main!.prisma.wallet.create({ data: { userId: user.id, name: 'BCA Debit', type: 'BANK', balance: 500000 } });
  const wallet = await main!.prisma.wallet.create({ data: { userId: user.id, name: 'BCA Payroll', type: 'BANK', balance: 500000 } });
  const category = await main!.prisma.category.create({ data: { userId: user.id, name: 'Food', type: 'EXPENSE', icon: 'food', color: '#000000' } });
  return { user, wallet, category };
}

/** A conversation whose only turn left a PENDING wallet clarification. */
async function pendingClarification(server: express.Express, userId: string, categoryId: string) {
  const asked = await request(server).post('/execute').set('x-test-user', userId)
    .send({ intent: 'transaction.create', arguments: { type: 'EXPENSE', amount: '50000', walletReference: 'BCA', categoryId, date: '2026-07-24' } });
  expect(asked.body.error.status).toBe('clarification_required');
  const { conversationId, data: { clarification } } = asked.body.error;
  return { conversationId: conversationId as string, clarificationId: clarification.clarificationId as string, token: clarification.options[0].token as string };
}

type Outcome = { status: number; code?: string };
const outcome = (res: request.Response): Outcome => ({ status: res.status, code: res.body?.error?.code });
/** Success, or a typed 404/409 — never a 5xx, never an untyped error. */
function assertTyped(outcomes: Outcome[], label: string): void {
  const bad = outcomes.filter((o) => !(o.status === 200 || ((o.status === 404 || o.status === 409) && typeof o.code === 'string' && o.code.startsWith('ASSISTANT_'))));
  expect(bad, `${label}: ${JSON.stringify(bad.slice(0, 5))}`).toEqual([]);
}
function tally(outcomes: Outcome[]): Record<string, number> {
  return outcomes.reduce<Record<string, number>>((acc, o) => { const k = `${o.status}${o.code ? ` ${o.code}` : ''}`; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
}

describe.skipIf(!url)('Phase 38.2 conversation lock order (disposable PostgreSQL)', () => {
  // (a) select clarification ‖ delete conversation
  for (const latencyMs of [0, 200]) {
    it(`select clarification racing delete conversation: no 500, no deadlock (${latencyMs} ms write latency, ${ITERATIONS}x)`, async () => {
      const { user, category } = await fixture(`select-delete-${latencyMs}`);
      const seed = app(main!.prisma);
      const targets: Awaited<ReturnType<typeof pendingClarification>>[] = [];
      for (let i = 0; i < ITERATIONS; i++) targets.push(await pendingClarification(seed.server, user.id, category.id));

      const selects: Outcome[] = []; const deletes: Outcome[] = [];
      const deadlockDelta = await countingDeadlocks(latencyMs, async ({ prisma }) => {
        await listening(app(prisma).server, (server) => inBatches(ITERATIONS, async (i) => {
          const t = targets[i]!;
          const [sel, del] = await Promise.all([
            request(server).post(`/conversations/${t.conversationId}/clarifications/${t.clarificationId}/select`).set('x-test-user', user.id).send({ optionToken: t.token }),
            jitter(latencyMs === 0 ? 40 : 2500).then(() => request(server).delete(`/conversations/${t.conversationId}`).set('x-test-user', user.id)),
          ]);
          selects.push(outcome(sel)); deletes.push(outcome(del));
        }));
      });
      console.info(`[38.2a ${latencyMs}ms] select=${JSON.stringify(tally(selects))} delete=${JSON.stringify(tally(deletes))} deadlocks=${deadlockDelta}`);
      assertTyped(selects, 'select');
      assertTyped(deletes, 'delete');
      expect(deadlockDelta).toBe(0);
    }, 600_000);
  }

  // (b) select on an ARCHIVED conversation
  it('select clarification on an ARCHIVED conversation is rejected 409 CONVERSATION_ARCHIVED and leaves the clarification PENDING', async () => {
    const { user, category } = await fixture('select-archived');
    const { server } = app(main!.prisma);
    const t = await pendingClarification(server, user.id, category.id);
    expect((await request(server).post(`/conversations/${t.conversationId}/archive`).set('x-test-user', user.id)).status).toBe(200);

    const res = await request(server).post(`/conversations/${t.conversationId}/clarifications/${t.clarificationId}/select`).set('x-test-user', user.id).send({ optionToken: t.token });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_CONTINUABLE', detail: 'CONVERSATION_ARCHIVED' });
    expect(await main!.prisma.clarificationRequest.findUniqueOrThrow({ where: { id: t.clarificationId } })).toMatchObject({ status: 'PENDING' });
    expect(await main!.prisma.assistantFinancialDraft.count({ where: { conversationId: t.conversationId } })).toBe(0);
  });

  // (c) /messages and /execute ‖ delete conversation
  for (const latencyMs of [0, 200]) {
    it(`/messages and /execute racing delete conversation: no 500, no deadlock (${latencyMs} ms write latency, ${ITERATIONS}x)`, async () => {
      const { user, wallet, category } = await fixture(`messages-delete-${latencyMs}`);
      const conversationIds: string[] = [];
      for (let i = 0; i < ITERATIONS; i++) conversationIds.push((await main!.prisma.assistantConversation.create({ data: { userId: user.id, locale: 'id-ID' } })).id);

      const calls: Outcome[] = []; const deletes: Outcome[] = [];
      const deadlockDelta = await countingDeadlocks(latencyMs, async ({ prisma }) => {
        await listening(app(prisma).server, (server) => inBatches(ITERATIONS, async (i) => {
          const conversationId = conversationIds[i]!;
          const call = i % 2 === 0
            ? request(server).post('/messages').set('x-test-user', user.id).send({ message: 'Ringkas Juli', conversationId })
            : request(server).post('/execute').set('x-test-user', user.id)
              .send({ conversationId, intent: 'transaction.create', arguments: { type: 'EXPENSE', amount: '12500', walletId: wallet.id, categoryId: category.id, date: '2026-07-22', description: 'Lunch' } });
          const [res, del] = await Promise.all([
            call,
            jitter(latencyMs === 0 ? 40 : 2500).then(() => request(server).delete(`/conversations/${conversationId}`).set('x-test-user', user.id)),
          ]);
          calls.push(outcome(res)); deletes.push(outcome(del));
        }));
      });
      console.info(`[38.2c ${latencyMs}ms] calls=${JSON.stringify(tally(calls))} delete=${JSON.stringify(tally(deletes))} deadlocks=${deadlockDelta}`);
      assertTyped(calls, 'messages/execute');
      assertTyped(deletes, 'delete');
      expect(deadlockDelta).toBe(0);
    }, 600_000);
  }

  // (d) turn finalize ‖ delete conversation — finalize writes execution → message → turn → conversation,
  // while the delete locks the conversation and then cascades back into those same rows.
  for (const latencyMs of [0, 200]) {
    it(`turn finalize racing delete conversation: never throws, no deadlock (${latencyMs} ms write latency, ${ITERATIONS}x)`, async () => {
      const { user } = await fixture(`finalize-delete-${latencyMs}`);
      const seedConversations = createAssistantConversationService(main!.prisma);
      const turns: { conversationId: string; turnId: string; executionId: string }[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const turn = await seedConversations.beginTurn({ userId: user.id, correlationId: `finalize-${latencyMs}-${i}-${Math.random()}`, intent: 'transaction.create', locale: 'id-ID', content: 'x', source: 'USER_PROVIDED' });
        const executionId = await seedConversations.beginToolExecution({ ...turn, correlationId: `exec-${turn.turnId}`, toolId: 'transaction.create', capability: 'transaction.create', riskLevel: 'HIGH', policyDecision: 'DRAFT_AND_CONFIRM' });
        turns.push({ ...turn, executionId });
      }

      const failures: string[] = []; const deletes: string[] = [];
      const deadlockDelta = await countingDeadlocks(latencyMs, async ({ prisma }) => {
        const conversations = createAssistantConversationService(prisma);
        await inBatches(ITERATIONS, async (i) => {
          const t = turns[i]!;
          await Promise.all([
            conversations.finalize({ ...t, status: 'SUCCEEDED', turnStatus: 'SUCCEEDED', assistantContent: 'ok', assistantSource: 'DETERMINISTIC_RENDERER', durationMs: 1 })
              .catch((error: { code?: string }) => { failures.push(error.code ?? String(error)); }),
            jitter(latencyMs === 0 ? 20 : 800).then(() => conversations.deleteOwnedConversation(user.id, t.conversationId))
              .then(() => { deletes.push('200'); }, (error: { statusCode?: number; code?: string }) => { deletes.push(`${error.statusCode ?? 500} ${error.code}`); }),
          ]);
        });
      });
      console.info(`[38.2d ${latencyMs}ms] finalizeFailures=${JSON.stringify(failures)} delete=${JSON.stringify(deletes.reduce<Record<string, number>>((a, k) => ({ ...a, [k]: (a[k] ?? 0) + 1 }), {}))} deadlocks=${deadlockDelta}`);
      expect(failures).toEqual([]);
      expect(deletes.filter((d) => d !== '200' && d !== '404 ASSISTANT_CONVERSATION_NOT_FOUND')).toEqual([]);
      expect(deadlockDelta).toBe(0);
    }, 600_000);
  }
});
