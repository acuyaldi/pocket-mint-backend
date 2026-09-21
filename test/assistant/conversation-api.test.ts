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
  app.post('/conversations/:conversationId/restore', c.restore); app.delete('/conversations/:conversationId', c.remove);
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

  it('passes through Phase 30 channel/source attribution without leaking provider identifiers', async () => {
    const payload = {
      conversation: { id: 'c1', status: 'ACTIVE', sourceChannels: ['WEB', 'TELEGRAM'] },
      messages: { items: [], page: 1, limit: 20, total: 0, hasMore: false },
      turns: [
        { id: 't1', correlationId: 'corr-1', status: 'SUCCEEDED', intent: 'x', safeErrorCode: null, startedAt: new Date(), finishedAt: new Date(), channel: 'TELEGRAM', toolExecutions: [] },
        { id: 't2', correlationId: 'corr-2', status: 'SUCCEEDED', intent: 'x', safeErrorCode: null, startedAt: new Date(), finishedAt: new Date(), channel: 'WEB', toolExecutions: [] },
      ],
    };
    const conversations = { getOwnedConversation: vi.fn().mockResolvedValue(payload) };
    const res = await request(appFor(conversations)).get('/conversations/c1');
    const body = JSON.stringify(res.body);
    expect(res.body.data.conversation.sourceChannels).toEqual(['WEB', 'TELEGRAM']);
    expect(res.body.data.turns.map((t: { channel: string }) => t.channel)).toEqual(['TELEGRAM', 'WEB']);
    // Only the safe channel label ever crosses the HTTP boundary — never a
    // Telegram chat/sender id, callback token, or raw provider payload.
    expect(body).not.toMatch(/externalChatId|externalSenderId|externalUserId|callbackQueryId|callbackToken|chat_id|sender_id/i);
  });

  it('passes through Phase 31/32 channel delivery status without leaking provider identifiers or raw payloads', async () => {
    const payload = {
      conversation: { id: 'c1', status: 'ACTIVE', sourceChannels: ['WEB', 'TELEGRAM'] },
      messages: { items: [], page: 1, limit: 20, total: 0, hasMore: false },
      turns: [
        { id: 't1', correlationId: 'corr-1', status: 'SUCCEEDED', intent: 'x', safeErrorCode: null, startedAt: new Date(), finishedAt: new Date(), channel: 'TELEGRAM', toolExecutions: [], deliveryStatus: 'DELIVERED' },
        { id: 't2', correlationId: 'corr-2', status: 'RUNNING', intent: 'x', safeErrorCode: null, startedAt: new Date(), finishedAt: null, channel: 'TELEGRAM', toolExecutions: [], deliveryStatus: 'PROCESSING' },
        { id: 't3', correlationId: 'corr-3', status: 'FAILED', intent: 'x', safeErrorCode: null, startedAt: new Date(), finishedAt: new Date(), channel: 'TELEGRAM', toolExecutions: [], deliveryStatus: 'FAILED' },
        { id: 't4', correlationId: 'corr-4', status: 'SUCCEEDED', intent: 'x', safeErrorCode: null, startedAt: new Date(), finishedAt: new Date(), channel: 'WEB', toolExecutions: [], deliveryStatus: 'NOT_APPLICABLE' },
        // A TELEGRAM turn whose delivery row is no longer retained (retention-purged) — an explicit UNKNOWN (Phase 32), never omitted and never a guessed value.
        { id: 't5', correlationId: 'corr-5', status: 'SUCCEEDED', intent: 'x', safeErrorCode: null, startedAt: new Date(), finishedAt: new Date(), channel: 'TELEGRAM', toolExecutions: [], deliveryStatus: 'UNKNOWN' },
      ],
    };
    const conversations = { getOwnedConversation: vi.fn().mockResolvedValue(payload) };
    const res = await request(appFor(conversations)).get('/conversations/c1');
    const body = JSON.stringify(res.body);
    expect(res.body.data.turns.map((t: { deliveryStatus?: string }) => t.deliveryStatus)).toEqual([
      'DELIVERED', 'PROCESSING', 'FAILED', 'NOT_APPLICABLE', 'UNKNOWN',
    ]);
    // Only the closed, safe status label ever crosses the HTTP boundary — never a
    // provider message id, destination chat id, rendered outbound text, or reply markup.
    expect(body).not.toMatch(/providerMessageId|destinationChatId|renderedText|replyMarkup|targetMessageId|externalChatId|externalSenderId|callbackToken/i);
  });

  it('passes through Phase 30 sourceChannels on the conversation list without leaking provider identifiers', async () => {
    const payload = {
      items: [{ id: 'c1', status: 'ACTIVE', locale: 'id-ID', createdAt: new Date(), updatedAt: new Date(), lastActivityAt: new Date(), sourceChannels: ['TELEGRAM'] }],
      page: 1, limit: 20, total: 1, hasMore: false,
    };
    const conversations = { listOwnedConversations: vi.fn().mockResolvedValue(payload) };
    const res = await request(appFor(conversations)).get('/conversations');
    expect(res.body.data.items[0].sourceChannels).toEqual(['TELEGRAM']);
    expect(JSON.stringify(res.body)).not.toMatch(/externalChatId|externalSenderId|externalUserId|callbackQueryId|callbackToken/i);
  });

  it('archives through the ownership-scoped service', async () => {
    const conversations = { archiveOwnedConversation: vi.fn().mockResolvedValue({ id: 'c1', status: 'ARCHIVED' }) };
    const res = await request(appFor(conversations)).post('/conversations/c1/archive');
    expect(res.status).toBe(200); expect(conversations.archiveOwnedConversation).toHaveBeenCalledWith('owner-1', 'c1');
  });

  it('restores through the ownership-scoped service', async () => {
    const conversations = { restoreOwnedConversation: vi.fn().mockResolvedValue({ id: 'c1', status: 'ACTIVE', archivedAt: null }) };
    const res = await request(appFor(conversations)).post('/conversations/c1/restore');
    expect(res.status).toBe(200); expect(conversations.restoreOwnedConversation).toHaveBeenCalledWith('owner-1', 'c1');
  });

  it('deletes through the ownership-scoped service, using DELETE rather than reusing archive', async () => {
    const conversations = { deleteOwnedConversation: vi.fn().mockResolvedValue({ id: 'c1' }) };
    const res = await request(appFor(conversations)).delete('/conversations/c1');
    expect(res.status).toBe(200); expect(conversations.deleteOwnedConversation).toHaveBeenCalledWith('owner-1', 'c1');
  });

  it('returns 401 without a forwarded error when unauthenticated on the new routes', async () => {
    const app = express(); app.use(express.json()); app.use(correlationMiddleware);
    app.use((req, _res, next) => { (req as any).auth = {}; next(); });
    const c = createAssistantControllers({ execute: vi.fn() } as any, { restoreOwnedConversation: vi.fn(), deleteOwnedConversation: vi.fn() } as any);
    app.post('/conversations/:conversationId/restore', c.restore);
    app.delete('/conversations/:conversationId', c.remove);
    app.use(errorHandler);
    expect((await request(app).post('/conversations/c1/restore')).status).toBe(401);
    expect((await request(app).delete('/conversations/c1')).status).toBe(401);
  });
});
