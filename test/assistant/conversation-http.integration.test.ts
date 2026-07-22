import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPrismaResources } from '../../src/lib/prismaFactory';
import { assertTestDatabaseUrl } from '../../src/lib/assertTestDatabaseUrl';
import { createAssistantConversationService } from '../../src/assistant/conversation.service';
import { createAssistantApplicationService } from '../../src/assistant/application.service';
import { ToolRegistry } from '../../src/assistant/registry';
import { monthlySpendingSummary } from '../../src/assistant/tools';
import { createAssistantControllers } from '../../src/controllers/assistant.controller';
import { correlationMiddleware } from '../../src/http/correlation';
import { errorHandler } from '../../src/middlewares/error.middleware';

const url = process.env.TEST_DATABASE_URL;
if (url) assertTestDatabaseUrl(url);
const resources = url ? createPrismaResources(url, { max: 5 }) : undefined;
const users: string[] = [];
afterAll(() => resources?.close());
afterEach(async () => { if (resources && users.length) await resources.prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } }); });

describe.skipIf(!url)('Assistant conversation HTTP lifecycle (disposable PostgreSQL)', () => {
  async function user(name: string) { const row = await resources!.prisma.user.create({ data: { email: `${name}-${Date.now()}-${Math.random()}@test.local`, name } }); users.push(row.id); return row.id; }
  function app(handler = vi.fn(async (input: any) => ({ month: input.month, totalIncome: 100, totalExpense: 40, netSavings: 60, transactionCount: 2, topCategories: [] }))) {
    const conversations = createAssistantConversationService(resources!.prisma);
    const registry = new ToolRegistry(); registry.register(monthlySpendingSummary);
    const application = createAssistantApplicationService({ conversations, toolRegistry: registry, handlerRegistry: new Map([[monthlySpendingSummary.id, handler]]) });
    const controllers = createAssistantControllers(application, conversations);
    const server = express(); server.use(express.json()); server.use(correlationMiddleware);
    server.use((req, _res, next) => { (req as any).auth = { userId: req.header('x-test-user') }; next(); });
    server.post('/execute', controllers.execute); server.get('/conversations', controllers.list);
    server.get('/conversations/:conversationId', controllers.get); server.post('/conversations/:conversationId/archive', controllers.archive);
    server.use(errorHandler); return server;
  }

  it('creates, continues, lists, retrieves, archives, and protects ownership', async () => {
    const owner = await user('owner'); const other = await user('other'); const server = app();
    const first = await request(server).post('/execute').set('x-test-user', owner).send({ message: 'Ringkas Juli', intent: monthlySpendingSummary.id, arguments: { month: '2026-07' } });
    expect(first.status).toBe(200); expect(first.body.data).toMatchObject({ status: 'success', conversationId: expect.any(String), turnId: expect.any(String) });
    const conversationId = first.body.data.conversationId;
    const continued = await request(server).post('/execute').set('x-test-user', owner).send({ conversationId, intent: monthlySpendingSummary.id, arguments: { month: '2026-08' } });
    expect(continued.status).toBe(200); expect(continued.body.data.conversationId).toBe(conversationId);
    const list = await request(server).get('/conversations').set('x-test-user', owner);
    expect(list.body.data.items).toHaveLength(1); expect(list.body.data.items[0].userId).toBeUndefined();
    const detail = await request(server).get(`/conversations/${conversationId}`).set('x-test-user', owner);
    expect(detail.body.data.messages.items).toHaveLength(4);
    expect(detail.body.data.messages.items[0]).toMatchObject({ content: 'Ringkas Juli', source: 'USER_PROVIDED' });
    expect(detail.body.data.messages.items[2]).toMatchObject({ content: 'analytics.monthly-spending-summary(month=2026-08)', source: 'CANONICAL_FALLBACK' });
    expect((await request(server).get(`/conversations/${conversationId}`).set('x-test-user', other)).status).toBe(404);
    expect((await request(server).post(`/conversations/${conversationId}/archive`).set('x-test-user', owner)).status).toBe(200);
    expect((await request(server).post('/execute').set('x-test-user', owner).send({ conversationId, intent: monthlySpendingSummary.id, arguments: { month: '2026-09' } })).status).toBe(409);
  });

  it.each([
    ['unsupported intent', { intent: JSON.stringify({ raw: 'secret-request' }), arguments: { raw: 'secret-arguments' } }],
    ['malformed arguments', { intent: monthlySpendingSummary.id, arguments: { month: 'secret-month' } }],
  ])('persists a safe rejected lifecycle without execution for %s', async (_label, body) => {
    const owner = await user('rejected');
    const handler = vi.fn();
    const response = await request(app(handler)).post('/execute').set('x-test-user', owner).send(body);
    expect(response.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
    const turn = await resources!.prisma.assistantTurn.findFirstOrThrow({ where: { conversation: { userId: owner } }, include: { messages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }, toolExecutions: true } });
    expect(turn.status).toBe('REJECTED');
    expect(turn.intent).toBe('unresolved');
    expect(turn.toolExecutions).toHaveLength(0);
    expect(turn.messages).toHaveLength(2);
    expect(turn.messages[0]).toMatchObject({ role: 'USER', source: 'SAFE_REQUEST_SUMMARY', content: 'Permintaan Assistant tidak dapat diproses.' });
    expect(JSON.stringify(turn)).not.toContain('secret-request');
    expect(JSON.stringify(turn)).not.toContain('secret-arguments');
    expect(JSON.stringify(turn)).not.toContain('secret-month');
  });

  it('rejects an oversized message before creating lifecycle records or calling finance', async () => {
    const owner = await user('oversized-http');
    const handler = vi.fn();
    const response = await request(app(handler)).post('/execute').set('x-test-user', owner).send({ message: 'x'.repeat(10_001), intent: monthlySpendingSummary.id, arguments: { month: '2026-07' } });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ASSISTANT_INVALID_REQUEST');
    expect(handler).not.toHaveBeenCalled();
    expect(await resources!.prisma.assistantConversation.count({ where: { userId: owner } })).toBe(0);
  });
});
