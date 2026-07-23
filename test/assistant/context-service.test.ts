import { describe, expect, it, vi } from 'vitest';
import { AssistantError } from '../../src/assistant/errors';
import { createAssistantContextService } from '../../src/assistant/context.service';

const conversation = {
  id: 'c1', status: 'ACTIVE', locale: 'id-ID',
  createdAt: new Date('2026-07-23T00:00:00Z'), updatedAt: new Date('2026-07-23T00:01:00Z'),
};

function setup(found: any = conversation) {
  const db = {
    assistantConversation: { findFirst: vi.fn().mockResolvedValue(found ? { ...found, messages: found.messages ?? [] } : null), create: vi.fn(), update: vi.fn() },
    assistantMessage: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    assistantFinancialDraft: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(), update: vi.fn() },
    assistantToolExecution: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn() },
    assistantTurn: { create: vi.fn(), update: vi.fn() },
    assistantIdempotencyRecord: { create: vi.fn(), update: vi.fn() },
    transaction: { create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(), $executeRaw: vi.fn(), $queryRaw: vi.fn(),
  };
  return { db, service: createAssistantContextService(db as never, () => new Date('2026-07-23T00:00:30Z')) };
}

describe('AssistantContextService', () => {
  it('performs one ownership lookup and three bounded batched reads', async () => {
    const { db, service } = setup();

    const context = await service.buildExecutionContext({ userId: 'u1', conversationId: 'c1', currentRequest: 'Halo' });

    expect(context.currentRequest.content).toBe('Halo');
    expect(db.assistantConversation.findFirst).toHaveBeenCalledOnce();
    expect(db.assistantConversation.findFirst).toHaveBeenCalledWith({
      where: { id: 'c1', userId: 'u1' },
      select: {
        id: true, status: true, locale: true, createdAt: true, updatedAt: true,
        messages: {
          where: { role: 'ASSISTANT' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1,
          select: expect.objectContaining({ turn: { select: { status: true, createdAt: true } } }),
        },
      },
    });
    expect(db.assistantMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { conversationId: 'c1', role: { in: ['USER', 'ASSISTANT'] } }, take: 40,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: expect.objectContaining({ turn: { select: { status: true, createdAt: true } } }),
    }));
    expect(db.assistantFinancialDraft.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { conversationId: 'c1', userId: 'u1', status: 'PENDING_CONFIRMATION', expiresAt: { gt: new Date('2026-07-23T00:00:30Z') } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    expect(db.assistantToolExecution.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { conversationId: 'c1' }, take: 10, orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    }));
  });

  it('preserves the latest assistant response when the bounded history is user-only', async () => {
    const latestAssistant = {
      id: 'assistant-protected', turnId: 'assistant-turn', role: 'ASSISTANT' as const, source: 'DETERMINISTIC_RENDERER' as const,
      content: 'Latest assistant response', createdAt: new Date('2026-07-23T00:00:01Z'),
      turn: { status: 'SUCCEEDED' as const, createdAt: new Date('2026-07-23T00:00:01Z') },
    };
    const { db, service } = setup({ ...conversation, messages: [latestAssistant] });
    db.assistantMessage.findMany.mockResolvedValue(Array.from({ length: 40 }, (_, index) => ({
      id: `user-${index}`, turnId: `user-turn-${index}`, role: 'USER', source: 'USER_PROVIDED', content: `user-${index}`,
      createdAt: new Date(Date.UTC(2026, 6, 23, 1, 0, index)), turn: { status: 'RUNNING', createdAt: new Date(Date.UTC(2026, 6, 23, 1, 0, index)) },
    })));

    const context = await service.buildExecutionContext({ userId: 'u1', conversationId: 'c1', currentRequest: 'Halo' });

    expect(context.turns.flatMap((turn) => turn.messages.map((message) => message.content))).toContain('Latest assistant response');
    expect(db.assistantConversation.findFirst).toHaveBeenCalledOnce();
    expect(db.assistantMessage.findMany).toHaveBeenCalledOnce();
  });

  it('does not query child tables when ownership validation fails', async () => {
    const { db, service } = setup(null);

    await expect(service.buildExecutionContext({ userId: 'u2', conversationId: 'c1', currentRequest: 'Halo' }))
      .rejects.toMatchObject({ code: 'ASSISTANT_CONVERSATION_NOT_FOUND' });
    expect(db.assistantMessage.findMany).not.toHaveBeenCalled();
    expect(db.assistantFinancialDraft.findFirst).not.toHaveBeenCalled();
    expect(db.assistantToolExecution.findMany).not.toHaveBeenCalled();
  });

  it('rejects archived conversations before reading history', async () => {
    const { db, service } = setup({ ...conversation, status: 'ARCHIVED' });

    await expect(service.buildExecutionContext({ userId: 'u1', conversationId: 'c1', currentRequest: 'Halo' }))
      .rejects.toEqual(AssistantError.conversationNotContinuable());
    expect(db.assistantMessage.findMany).not.toHaveBeenCalled();
  });

  it('never calls a write-capable Prisma method', async () => {
    const { db, service } = setup();

    await service.buildExecutionContext({ userId: 'u1', conversationId: 'c1', currentRequest: 'Halo' });

    const writes = [
      db.assistantConversation.create, db.assistantConversation.update,
      db.assistantMessage.create, db.assistantFinancialDraft.create, db.assistantFinancialDraft.update,
      db.assistantToolExecution.create, db.assistantToolExecution.update,
      db.assistantTurn.create, db.assistantTurn.update, db.assistantIdempotencyRecord.create,
      db.assistantIdempotencyRecord.update, db.transaction.create, db.transaction.update,
      db.$transaction, db.$executeRaw, db.$queryRaw,
    ];
    for (const write of writes) expect(write).not.toHaveBeenCalled();
  });
});
