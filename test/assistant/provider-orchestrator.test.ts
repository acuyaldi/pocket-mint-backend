import { describe, expect, it, vi } from 'vitest';
import { createAssistantProviderRuntime } from '../../src/assistant/provider-runtime';
import { ToolRegistry } from '../../src/assistant/registry';
import { monthlySpendingSummary, transactionCreate } from '../../src/assistant/tools';
import { AssistantProviderError } from '../../src/assistant/provider-types';
import type { AssistantContext } from '../../src/assistant/context.types';

const context: AssistantContext = {
  system: { contextVersion: '1', locale: 'id-ID' },
  conversation: {
    conversationId: 'c1',
    createdAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
    archived: false,
  },
  turns: [],
  toolExecutions: [],
  currentRequest: { role: 'USER', source: 'CURRENT_REQUEST', content: 'Ringkas Juli' },
};

function setup(output: unknown = {
  kind: 'intent',
  intent: 'analytics.monthly-spending-summary',
  arguments: { month: '2026-07' },
  clarification: null,
  userMessage: 'ignored',
}) {
  const registry = new ToolRegistry();
  registry.register(monthlySpendingSummary);
  registry.register(transactionCreate);
  const application = {
    prepareProviderExecution: vi.fn().mockResolvedValue(context),
    execute: vi.fn().mockResolvedValue({
      httpStatus: 200,
      response: {
        status: 'success',
        renderedText: 'Ringkasan deterministik',
        data: { month: '2026-07' },
        correlationId: 'corr-1',
        conversationId: 'c1',
        turnId: 't1',
      },
    }),
  };
  const conversations = {
    establishConversation: vi.fn().mockResolvedValue('c1'),
    beginTurn: vi.fn().mockResolvedValue({ conversationId: 'c1', turnId: 't1' }),
    finalizeWithoutTool: vi.fn().mockResolvedValue(undefined),
  };
  const provider = {
    kind: 'gemini' as const,
    model: 'gemini-test',
    generateStructuredResponse: vi.fn().mockResolvedValue({
      output,
      outputBytes: Buffer.byteLength(JSON.stringify(output), 'utf8'),
      finishClassification: 'STOP' as const,
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    }),
  };
  const audit = {
    begin: vi.fn().mockResolvedValue('p1'),
    finalize: vi.fn().mockResolvedValue(undefined),
  };
  const dependencies = {
    application: application as never,
    conversations: conversations as never,
    provider,
    audit: audit as never,
    toolRegistry: registry,
    timeoutMs: 100,
  };
  const runtime = createAssistantProviderRuntime(dependencies);
  return { runtime, dependencies, application, conversations, provider, audit };
}

describe('Assistant provider runtime orchestration', () => {
  it('prepares context, calls the provider, and delegates a valid intent exactly once', async () => {
    const { runtime, application, conversations, provider, audit } = setup();
    const result = await runtime.sendMessage('u1', 'corr-1', { message: ' Ringkas Juli ' });

    expect(result.response.status).toBe('success');
    expect(conversations.establishConversation).toHaveBeenCalledOnce();
    expect(application.prepareProviderExecution).toHaveBeenCalledOnce();
    expect(application.prepareProviderExecution).toHaveBeenCalledWith({
      userId: 'u1', conversationId: 'c1', currentRequest: 'Ringkas Juli',
    });
    expect(provider.generateStructuredResponse).toHaveBeenCalledOnce();
    expect(application.execute).toHaveBeenCalledOnce();
    expect(application.execute).toHaveBeenCalledWith('u1', 'corr-1', {
      conversationId: 'c1',
      message: 'Ringkas Juli',
      intent: 'analytics.monthly-spending-summary',
      arguments: { month: '2026-07' },
      locale: 'id-ID',
    });
    expect(conversations.beginTurn).not.toHaveBeenCalled();
    expect(audit.finalize).toHaveBeenCalledWith('p1', expect.objectContaining({
      status: 'PLAN_ACCEPTED', turnId: 't1', usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    }));
  });

  it('persists one clarification response and executes no deterministic capability', async () => {
    const { runtime, application, conversations, audit } = setup({
      kind: 'clarification',
      intent: null,
      arguments: {},
      clarification: { question: 'Bulan mana yang ingin diringkas?' },
      userMessage: 'ignored',
    });
    const result = await runtime.sendMessage('u1', 'corr-1', { conversationId: 'c1', message: 'Ringkas pengeluaran' });

    expect(result).toMatchObject({
      httpStatus: 200,
      response: { status: 'clarification_required', message: 'Bulan mana yang ingin diringkas?', conversationId: 'c1', turnId: 't1' },
    });
    expect(application.execute).not.toHaveBeenCalled();
    expect(conversations.beginTurn).toHaveBeenCalledOnce();
    expect(conversations.finalizeWithoutTool).toHaveBeenCalledWith(expect.objectContaining({
      turnStatus: 'CLARIFICATION_REQUIRED',
      assistantSource: 'PROVIDER_CLARIFICATION',
    }));
    expect(audit.finalize).toHaveBeenCalledWith('p1', expect.objectContaining({ status: 'CLARIFICATION', turnId: 't1' }));
  });

  it('persists deterministic unsupported text and executes no capability', async () => {
    const { runtime, application, conversations } = setup({
      kind: 'unsupported', intent: null, arguments: {}, clarification: null, userMessage: 'unsafe model prose',
    });
    const result = await runtime.sendMessage('u1', 'corr-1', { message: 'Book a flight' });

    expect(result.response).toMatchObject({
      status: 'unsupported',
      message: 'Permintaan tersebut belum didukung oleh Assistant.',
    });
    expect(application.execute).not.toHaveBeenCalled();
    expect(conversations.finalizeWithoutTool).toHaveBeenCalledWith(expect.objectContaining({
      assistantContent: 'Permintaan tersebut belum didukung oleh Assistant.',
      turnStatus: 'SUCCEEDED',
    }));
  });

  it.each([
    ['malformed output', { kind: 'intent', intent: 'finance.destroy' }, 'ASSISTANT_PROVIDER_INVALID_RESPONSE', 502],
    ['rate limit', AssistantProviderError.rateLimited(), 'ASSISTANT_PROVIDER_RATE_LIMITED', 429],
    ['provider unavailable', AssistantProviderError.unavailable(), 'ASSISTANT_PROVIDER_UNAVAILABLE', 503],
  ])('maps %s safely without execution or retries', async (_label, providerResult, code, status) => {
    const setupResult = setup(providerResult);
    if (providerResult instanceof Error) {
      setupResult.provider.generateStructuredResponse.mockRejectedValue(providerResult);
    }
    const result = await setupResult.runtime.sendMessage('u1', 'corr-1', { message: 'request' });

    expect(result).toMatchObject({ httpStatus: status, response: { status: 'error', code } });
    expect(setupResult.provider.generateStructuredResponse).toHaveBeenCalledOnce();
    expect(setupResult.application.execute).not.toHaveBeenCalled();
    expect(setupResult.conversations.finalizeWithoutTool).toHaveBeenCalledWith(expect.objectContaining({
      turnStatus: 'FAILED',
      safeErrorCode: code,
      assistantSource: 'SAFE_ERROR',
    }));
    expect(JSON.stringify(setupResult.conversations.finalizeWithoutTool.mock.calls)).not.toContain('finance.destroy');
  });

  it('aborts and returns a timeout without retrying or executing a capability', async () => {
    const { dependencies, provider, application, conversations } = setup();
    provider.generateStructuredResponse.mockImplementation(({ signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(AssistantProviderError.timeout()), { once: true });
    }));
    const shortRuntime = createAssistantProviderRuntime({
      ...dependencies,
      timeoutMs: 5,
    });

    const result = await shortRuntime.sendMessage('u1', 'corr-1', { message: 'request' });
    expect(result).toMatchObject({ httpStatus: 504, response: { code: 'ASSISTANT_PROVIDER_TIMEOUT' } });
    expect(provider.generateStructuredResponse).toHaveBeenCalledOnce();
    expect(application.execute).not.toHaveBeenCalled();
    expect(conversations.finalizeWithoutTool).toHaveBeenCalledOnce();
  });

  it('rejects an empty message before context preparation or provider invocation', async () => {
    const { runtime, application, provider } = setup();
    await expect(runtime.sendMessage('u1', 'corr-1', { message: '   ' })).rejects.toMatchObject({
      code: 'ASSISTANT_INVALID_REQUEST',
    });
    expect(application.prepareProviderExecution).not.toHaveBeenCalled();
    expect(provider.generateStructuredResponse).not.toHaveBeenCalled();
  });

  it('never starts a second turn when deterministic execution persistence fails', async () => {
    const { runtime, application, conversations, provider } = setup();
    application.execute.mockRejectedValue(new Error('deterministic persistence failed'));

    await expect(runtime.sendMessage('u1', 'corr-1', { message: 'request' }))
      .rejects.toThrow('deterministic persistence failed');
    expect(provider.generateStructuredResponse).toHaveBeenCalledOnce();
    expect(application.execute).toHaveBeenCalledOnce();
    expect(conversations.beginTurn).not.toHaveBeenCalled();
    expect(conversations.finalizeWithoutTool).not.toHaveBeenCalled();
  });
});
