import { describe, expect, it, vi } from 'vitest';
import { createAssistantApplicationService } from '../../src/assistant/application.service';
import { ToolRegistry } from '../../src/assistant/registry';
import { monthlySpendingSummary } from '../../src/assistant/tools';

function setup() {
  const conversations = {
    assertContinuable: vi.fn(), beginTurn: vi.fn().mockResolvedValue({ conversationId: 'c1', turnId: 't1' }),
    markTurnRunning: vi.fn().mockResolvedValue(undefined), beginToolExecution: vi.fn().mockResolvedValue('e1'), finalize: vi.fn().mockResolvedValue(undefined),
    finalizeRejected: vi.fn().mockResolvedValue(undefined),
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
    expect(conversations.beginToolExecution).not.toHaveBeenCalled();
    expect(conversations.finalizeRejected).toHaveBeenCalledWith(expect.objectContaining({ safeErrorCode: 'ASSISTANT_INVALID_INPUT' }));
  });

  it('persists a safe rejection without execution for unsupported intent', async () => {
    const { service, conversations, handler } = setup();
    const raw = JSON.stringify({ intent: 'finance.destroy', arguments: { secret: 'do-not-store' } });
    const result = await service.execute('u1', 'corr-unsupported', { intent: raw, arguments: { secret: 'do-not-store' } });
    expect(result.response.status).toBe('rejected');
    expect(conversations.beginTurn).toHaveBeenCalledWith(expect.objectContaining({ content: 'Permintaan Assistant tidak dapat diproses.', source: 'SAFE_REQUEST_SUMMARY' }));
    expect(JSON.stringify(conversations.beginTurn.mock.calls)).not.toContain('do-not-store');
    expect(conversations.beginToolExecution).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('checks ownership before validating or invoking a tool', async () => {
    const { service, conversations, handler } = setup();
    conversations.assertContinuable.mockRejectedValue(new Error('not owned'));
    await expect(service.execute('u2', 'corr3', { conversationId: 'c1', intent: monthlySpendingSummary.id, arguments: { month: '2026-07' } })).rejects.toThrow('not owned');
    expect(handler).not.toHaveBeenCalled();
    expect(conversations.beginTurn).not.toHaveBeenCalled();
  });

  it('does not invoke the handler when initial persistence fails', async () => {
    const { service, conversations, handler } = setup();
    conversations.beginTurn.mockRejectedValue(new Error('persistence unavailable'));
    await expect(service.execute('u1', 'corr4', { intent: monthlySpendingSummary.id, arguments: { month: '2026-07' } })).rejects.toThrow('persistence unavailable');
    expect(handler).not.toHaveBeenCalled();
  });

  it('records a terminal failure and safe assistant message when the handler fails', async () => {
    const { service, conversations, handler } = setup();
    handler.mockRejectedValue(new Error('private database detail'));
    const result = await service.execute('u1', 'corr5', { intent: monthlySpendingSummary.id, arguments: { month: '2026-07' } });
    expect(result.response).toMatchObject({ status: 'error', code: 'ASSISTANT_EXECUTION_FAILED', message: 'Assistant execution failed' });
    expect(conversations.finalize).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED', turnStatus: 'FAILED', assistantSource: 'SAFE_ERROR' }));
  });

  it('never returns success or rewrites execution state when final persistence fails', async () => {
    const { service, conversations } = setup();
    conversations.finalize.mockRejectedValue(new Error('final persistence unavailable'));
    await expect(service.execute('u1', 'corr6', { intent: monthlySpendingSummary.id, arguments: { month: '2026-07' } })).rejects.toThrow('final persistence unavailable');
    expect(conversations.finalize).toHaveBeenCalledTimes(1);
  });
});
