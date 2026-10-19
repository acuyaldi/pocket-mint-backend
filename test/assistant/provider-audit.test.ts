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

  // Phase 37.4 — AssistantProviderExecution.conversationId cascades from
  // AssistantConversation, so a concurrent deleteOwnedConversation can
  // delete this row before finalize() runs. Audit bookkeeping must never
  // fail an otherwise-successful request: no-op + structured warn log,
  // never throw.
  it('swallows a concurrent-delete P2025 instead of throwing, and logs a structured warning with no message content', async () => {
    const update = vi.fn().mockRejectedValue(Object.assign(new Error('Record to update not found.'), { code: 'P2025' }));
    const service = createAssistantProviderAuditService({
      assistantProviderExecution: { create: vi.fn(), update },
    } as never);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(service.finalize('provider-execution-1', {
      status: 'FAILED',
      turnId: 't1',
      durationMs: 10,
    })).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(warnSpy.mock.calls[0]![0] as string);
    expect(logged).toMatchObject({ level: 'warn', event: 'assistant.conversation_race_skip', stage: 'providerAudit.finalize', executionId: 'provider-execution-1', turnId: 't1' });
    warnSpy.mockRestore();
  });

  it('still propagates a non-P2025 error (never silently swallows an unrelated failure)', async () => {
    const update = vi.fn().mockRejectedValue(new Error('boom'));
    const service = createAssistantProviderAuditService({
      assistantProviderExecution: { create: vi.fn(), update },
    } as never);

    await expect(service.finalize('provider-execution-1', { status: 'FAILED', turnId: 't1', durationMs: 10 }))
      .rejects.toThrow('boom');
  });
});
