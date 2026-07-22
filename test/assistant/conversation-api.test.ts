import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAssistantControllers } from '../../src/controllers/assistant.controller';
import { correlationMiddleware } from '../../src/http/correlation';
import { errorHandler } from '../../src/middlewares/error.middleware';

function appFor(conversations: any) {
  const app = express(); app.use(express.json()); app.use(correlationMiddleware);
  app.use((req, _res, next) => { (req as any).auth = { userId: 'owner-1' }; next(); });
  const c = createAssistantControllers({ execute: vi.fn() } as any, conversations);
  app.get('/conversations', c.list); app.get('/conversations/:conversationId', c.get); app.post('/conversations/:conversationId/archive', c.archive);
  app.use(errorHandler); return app;
}

describe('Assistant conversation HTTP boundary', () => {
  it('passes trusted owner and bounded pagination inputs to list', async () => {
    const conversations = { listOwnedConversations: vi.fn().mockResolvedValue({ items: [], page: 2, limit: 100, total: 0, hasMore: false }) };
    const res = await request(appFor(conversations)).get('/conversations?page=2&limit=100');
    expect(res.status).toBe(200);
    expect(conversations.listOwnedConversations).toHaveBeenCalledWith('owner-1', 2, 100);
  });

  it('returns canonical content and source from owned detail without adding internal fields', async () => {
    const payload = { conversation: { id: 'c1', status: 'ACTIVE' }, messages: { items: [{ id: 'm1', turnId: 't1', role: 'USER', content: 'Halo', source: 'USER_PROVIDED', createdAt: new Date() }], page: 1, limit: 20, total: 1, hasMore: false } };
    const conversations = { getOwnedConversation: vi.fn().mockResolvedValue(payload) };
    const res = await request(appFor(conversations)).get('/conversations/c1');
    expect(res.body.data.messages.items[0]).toMatchObject({ content: 'Halo', source: 'USER_PROVIDED' });
    expect(res.body.data.userId).toBeUndefined();
    expect(conversations.getOwnedConversation).toHaveBeenCalledWith('owner-1', 'c1', undefined, undefined);
  });

  it('archives through the ownership-scoped service', async () => {
    const conversations = { archiveOwnedConversation: vi.fn().mockResolvedValue({ id: 'c1', status: 'ARCHIVED' }) };
    const res = await request(appFor(conversations)).post('/conversations/c1/archive');
    expect(res.status).toBe(200); expect(conversations.archiveOwnedConversation).toHaveBeenCalledWith('owner-1', 'c1');
  });
});
