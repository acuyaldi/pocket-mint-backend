import { describe, expect, it, vi } from 'vitest';
import { createAssistantApplicationService } from '../../src/assistant/application.service';
import { ToolRegistry } from '../../src/assistant/registry';
import { monthlySpendingSummary } from '../../src/assistant/tools';

function setup() {
  const conversations = {
    assertContinuable: vi.fn(), beginTurn: vi.fn().mockResolvedValue({ conversationId: 'c1', turnId: 't1' }),
    markTurnRunning: vi.fn(), beginToolExecution: vi.fn().mockResolvedValue('e1'), finalize: vi.fn(),
    finalizeRejected: vi.fn(), recoverFailedFinalization: vi.fn(),
  } as any;
  const registry = new ToolRegistry(); registry.register(monthlySpendingSummary);
  const handler = vi.fn().mockResolvedValue({ month: '2026-07', totalIncome: 10, totalExpense: 4, netSavings: 6, transactionCount: 2, topCategories: [] });
  return { conversations, handler, service: createAssistantApplicationService({ conversations, toolRegistry: registry, handlerRegistry: new Map([[monthlySpendingSummary.id, handler]]) }) };
}

describe('Assistant application lifecycle', () => {
  it('persists a validated fallback and successful terminal records', async () => {
    const { service, conversations } = setup();
    const result = await service.execute('u1', 'corr1', { intent: monthlySpendingSummary.id, arguments: { month: '2026-07' } });
    expect(result.response.status).toBe('success');
    expect(conversations.beginTurn).toHaveBeenCalledWith(expect.objectContaining({ content: 'analytics.monthly-spending-summary(month=2026-07)', source: 'CANONICAL_FALLBACK' }));
    expect(conversations.finalize).toHaveBeenCalledWith(expect.objectContaining({ status: 'SUCCEEDED', outputSummary: { month: '2026-07', transactionCount: 2, categoryCount: 0 } }));
  });

  it('persists only a constant safe representation for malformed arguments and never invokes the handler', async () => {
    const { service, conversations, handler } = setup();
    const result = await service.execute('u1', 'corr2', { intent: monthlySpendingSummary.id, arguments: { month: '<secret>' }, message: 'raw user text' });
    expect(result.response.status).toBe('rejected');
    expect(conversations.beginTurn).toHaveBeenCalledWith(expect.objectContaining({ content: 'Permintaan Assistant tidak dapat diproses.', source: 'SAFE_REQUEST_SUMMARY' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('checks ownership before validating or invoking a tool', async () => {
    const { service, conversations, handler } = setup();
    conversations.assertContinuable.mockRejectedValue(new Error('not owned'));
    await expect(service.execute('u2', 'corr3', { conversationId: 'c1', intent: monthlySpendingSummary.id, arguments: { month: '2026-07' } })).rejects.toThrow('not owned');
    expect(handler).not.toHaveBeenCalled();
    expect(conversations.beginTurn).not.toHaveBeenCalled();
  });
});
