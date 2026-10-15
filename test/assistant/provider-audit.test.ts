import { describe, expect, it, vi } from 'vitest';
import { createAssistantProviderAuditService } from '../../src/assistant/provider-audit.service';

describe('Assistant provider audit service', () => {
  it('persists only minimized request metadata', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'provider-execution-1' });
    const service = createAssistantProviderAuditService({
      assistantProviderExecution: { create, update: vi.fn() },
    } as never);

    await expect(service.begin({
      userId: 'u1',
      conversationId: 'c1',
      correlationId: 'corr-1',
      provider: 'gemini',
      model: 'gemini-test',
      inputBytes: 1234,
    })).resolves.toBe('provider-execution-1');
    expect(create).toHaveBeenCalledWith({ data: {
      userId: 'u1',
      conversationId: 'c1',
      correlationId: 'corr-1',
      provider: 'gemini',
      model: 'gemini-test',
      inputBytes: 1234,
    }, select: { id: true } });
    expect(JSON.stringify(create.mock.calls)).not.toMatch(/prompt|response|apiKey|message|arguments/i);
  });

  it('stores bounded status, byte counts, finish class, safe code, and neutral usage totals', async () => {
    const update = vi.fn().mockResolvedValue({});
    const service = createAssistantProviderAuditService({
      assistantProviderExecution: { create: vi.fn(), update },
    } as never);

    await service.finalize('provider-execution-1', {
      status: 'PLAN_ACCEPTED',
      turnId: 't1',
      durationMs: 42,
      outputBytes: 200,
      finishClassification: 'STOP',
      safeErrorCode: undefined,
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, cachedInputTokens: 2 },
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'provider-execution-1' },
      data: {
        status: 'PLAN_ACCEPTED',
        turnId: 't1',
        completedAt: expect.any(Date),
        durationMs: 42,
        outputBytes: 200,
        finishClassification: 'STOP',
        safeErrorCode: undefined,
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        cachedInputTokens: 2,
      },
    });
  });
});
