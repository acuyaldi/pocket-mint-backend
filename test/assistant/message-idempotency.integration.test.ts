import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantConversationService } from '../../src/assistant/conversation.service';
import { createAssistantContextService } from '../../src/assistant/context.service';
import { createAssistantApplicationService } from '../../src/assistant/application.service';
import { createAssistantFinancialDraftService } from '../../src/assistant/financial-draft.service';
import { createAssistantProviderAuditService } from '../../src/assistant/provider-audit.service';
import { createAssistantProviderRuntime } from '../../src/assistant/provider-runtime';
import { createClarificationService } from '../../src/assistant/clarification.service';
import { createTransactionService } from '../../src/services/transaction.service';
import { ToolRegistry } from '../../src/assistant/registry';
import { monthlySpendingSummary, transactionCreate } from '../../src/assistant/tools';
import { handleMonthlySpendingSummary } from '../../src/assistant/handlers/monthly-spending-summary.handler';
import { createAssistantControllers } from '../../src/controllers/assistant.controller';
import { correlationMiddleware } from '../../src/http/correlation';
import { errorHandler } from '../../src/middlewares/error.middleware';
import {
  EntityResolverRegistry,
  createCategoryResolver,
  createEntityResolutionService,
  createMerchantResolver,
  createWalletResolver,
} from '../../src/assistant/entity-resolution';

// Proves Phase 27 request-level idempotency: a Web client retry, double
// submit, or dropped-connection resubmit of POST /assistant/messages or
// POST /assistant/execute with the same Idempotency-Key can never create a
// second turn/draft, mirroring the guarantee financial-draft.integration.test.ts
// already proves for POST /assistant/drafts/:draftId/confirm.

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 12 }) : undefined;
const users: string[] = [];

afterAll(() => resources?.close());
afterEach(async () => {
  if (resources && users.length) {
    await resources.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  }
});

function modelResponse(output: unknown) {
  return {
    output,
    outputBytes: Buffer.byteLength(JSON.stringify(output), 'utf8'),
    finishClassification: 'STOP' as const,
    usage: { inputTokens: 20, outputTokens: 8, totalTokens: 28, cachedInputTokens: 3 },
  };
}

const monthlyPlan = () => modelResponse({
  kind: 'intent',
  intent: 'analytics.monthly-spending-summary',
  arguments: { month: '2026-07' },
  clarification: null,
  userMessage: 'Ringkas Juli',
});

describe.skipIf(!url)('Assistant request-level idempotency (disposable PostgreSQL)', () => {
  async function fixture(label: string) {
    const user = await resources!.prisma.user.create({ data: { email: `${label}-${Date.now()}-${Math.random()}@test.local`, name: label } });
    users.push(user.id);
    const wallet = await resources!.prisma.wallet.create({ data: { userId: user.id, name: 'Cash', type: 'CASH', balance: 100000, initialBalance: 100000 } });
    const category = await resources!.prisma.category.create({ data: { userId: user.id, name: 'Food', type: 'EXPENSE', icon: 'food', color: '#000000' } });
    return { user, wallet, category };
  }
  const draftBody = (walletId: string, categoryId: string) => ({ intent: 'transaction.create', arguments: { type: 'EXPENSE', amount: '12500.50', walletId, categoryId, date: '2026-07-22', description: 'Lunch' } });

  function setup(providerImplementation: ReturnType<typeof vi.fn>, timeoutMs = 500) {
    const conversations = createAssistantConversationService(resources!.prisma);
    const contexts = createAssistantContextService(resources!.prisma);
    const drafts = createAssistantFinancialDraftService(resources!.prisma, createTransactionService(resources!.prisma));
    const registry = new ToolRegistry();
    registry.register(monthlySpendingSummary);
    registry.register(transactionCreate);
    const entityResolvers = new EntityResolverRegistry();
    entityResolvers.register(createWalletResolver(resources!.prisma));
    entityResolvers.register(createMerchantResolver(resources!.prisma));
    entityResolvers.register(createCategoryResolver(resources!.prisma));
    entityResolvers.finalize();
    const application = createAssistantApplicationService({
      conversations,
      contexts,
      toolRegistry: registry,
      handlerRegistry: new Map([[monthlySpendingSummary.id, handleMonthlySpendingSummary as never]]),
      financialDrafts: drafts,
      entityResolution: createEntityResolutionService(entityResolvers),
      clarification: createClarificationService(resources!.prisma),
    });
    const provider = { kind: 'gemini' as const, model: 'gemini-test', generateStructuredResponse: providerImplementation };
    const runtime = createAssistantProviderRuntime({
      application,
      conversations,
      financialDrafts: drafts,
      provider,
      audit: createAssistantProviderAuditService(resources!.prisma),
      toolRegistry: registry,
      timeoutMs,
    });
    const controllers = createAssistantControllers(application, conversations, drafts, runtime);
    const server = express();
    server.use(express.json());
    server.use(correlationMiddleware);
    server.use((req, _res, next) => {
      (req as unknown as { auth: { userId?: string } }).auth = { userId: req.header('x-test-user') ?? undefined };
      next();
    });
    server.post('/execute', controllers.execute);
    server.post('/messages', controllers.messages);
    server.get('/conversations/:conversationId/recovery-state', controllers.recoveryState);
    server.use(errorHandler);
    return { server };
  }

  it('serializes concurrent identical-key /execute requests to exactly one draft', async () => {
    const { user, wallet, category } = await fixture('concurrent-execute');
    const { server } = setup(vi.fn());
    const responses = await Promise.all(Array.from({ length: 6 }, () =>
      request(server).post('/execute').set('x-test-user', user.id).set('Idempotency-Key', 'exec-key').send(draftBody(wallet.id, category.id)),
    ));
    expect(responses.every((r) => r.status === 200 || r.status === 409)).toBe(true);
    expect(responses.some((r) => r.status === 200)).toBe(true);
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(1);
    expect(await resources!.prisma.assistantTurn.count({ where: { intent: 'transaction.create' } })).toBe(1);
  });

  it('replays the exact same draft for a repeated /execute request using the same key', async () => {
    const { user, wallet, category } = await fixture('replay-execute');
    const { server } = setup(vi.fn());
    const first = await request(server).post('/execute').set('x-test-user', user.id).set('Idempotency-Key', 'replay-key').send(draftBody(wallet.id, category.id));
    const second = await request(server).post('/execute').set('x-test-user', user.id).set('Idempotency-Key', 'replay-key').send(draftBody(wallet.id, category.id));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.data.draftId).toBe(first.body.data.data.draftId);
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(1);
  });

  it('creates a separate draft per request when Idempotency-Key is omitted (backward compatible)', async () => {
    const { user, wallet, category } = await fixture('no-key');
    const { server } = setup(vi.fn());
    const first = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    const second = await request(server).post('/execute').set('x-test-user', user.id).send(draftBody(wallet.id, category.id));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.data.draftId).not.toBe(first.body.data.data.draftId);
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(2);
  });

  it('rejects a malformed Idempotency-Key before creating a draft', async () => {
    const { user, wallet, category } = await fixture('bad-key');
    const { server } = setup(vi.fn());
    const response = await request(server).post('/execute').set('x-test-user', user.id).set('Idempotency-Key', 'bad key with spaces!').send(draftBody(wallet.id, category.id));
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ASSISTANT_INVALID_IDEMPOTENCY_KEY');
    expect(await resources!.prisma.assistantFinancialDraft.count({ where: { userId: user.id } })).toBe(0);
  });

  it('serializes concurrent identical-key /messages requests to exactly one turn and one provider call', async () => {
    const { user } = await fixture('concurrent-messages');
    const generate = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve(monthlyPlan()), 30)));
    const { server } = setup(generate);
    const responses = await Promise.all(Array.from({ length: 4 }, () =>
      request(server).post('/messages').set('x-test-user', user.id).set('Idempotency-Key', 'msg-key').send({ message: 'Ringkas Juli' }),
    ));
    expect(responses.every((r) => r.status === 200 || r.status === 409)).toBe(true);
    expect(responses.some((r) => r.status === 200)).toBe(true);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await resources!.prisma.assistantTurn.count({ where: { intent: 'analytics.monthly-spending-summary' } })).toBe(1);
  });

  it('rejects reusing the same Idempotency-Key across /execute and /messages', async () => {
    const { user, wallet, category } = await fixture('cross-op');
    const { server } = setup(vi.fn().mockResolvedValue(monthlyPlan()));
    const execResponse = await request(server).post('/execute').set('x-test-user', user.id).set('Idempotency-Key', 'shared-key').send(draftBody(wallet.id, category.id));
    expect(execResponse.status).toBe(200);
    const msgResponse = await request(server).post('/messages').set('x-test-user', user.id).set('Idempotency-Key', 'shared-key').send({ message: 'Ringkas Juli' });
    expect(msgResponse.status).toBe(409);
    expect(msgResponse.body.error.code).toBe('ASSISTANT_IDEMPOTENCY_CONFLICT');
  });

  it('recovery-state exposes an active RUNNING turn so the client can stop guessing after a dropped request', async () => {
    const { user } = await fixture('active-turn');
    const { server } = setup(vi.fn().mockResolvedValue(monthlyPlan()));
    const created = await request(server).post('/messages').set('x-test-user', user.id).send({ message: 'first' });
    const conversationId = created.body.data.conversationId;
    const running = await resources!.prisma.assistantTurn.create({
      data: { conversationId, correlationId: 'manual-running-turn', intent: 'analytics.monthly-spending-summary', locale: 'id-ID', status: 'RUNNING' },
    });
    const recovery = await request(server).get(`/conversations/${conversationId}/recovery-state`).set('x-test-user', user.id);
    expect(recovery.status).toBe(200);
    expect(recovery.body.data.activeTurn).toMatchObject({ turnId: running.id, intent: 'analytics.monthly-spending-summary' });
  });
});
