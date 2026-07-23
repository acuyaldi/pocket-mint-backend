import { describe, expect, it } from 'vitest';
import {
  assembleAssistantContext,
  DEFAULT_ASSISTANT_CONTEXT_LIMITS,
} from '../../src/assistant/context.assembler';
import { serializeAssistantContext } from '../../src/assistant/context.serializer';
import { AssistantError } from '../../src/assistant/errors';

const at = (second: number) => new Date(`2026-07-23T00:00:${String(second).padStart(2, '0')}.000Z`);

function input() {
  return {
    conversation: {
      id: 'conversation-public', userId: 'hidden-owner', status: 'ACTIVE' as const, locale: 'id-ID',
      createdAt: at(0), updatedAt: at(9), lastActivityAt: at(9), archivedAt: null,
    },
    messages: [
      { id: 'message-2', turnId: 'turn-2', role: 'ASSISTANT' as const, source: 'DETERMINISTIC_RENDERER' as const, content: 'Jawaban terbaru', createdAt: at(4), turn: { status: 'SUCCEEDED' as const, createdAt: at(3), startedAt: at(9) } },
      { id: 'message-1', turnId: 'turn-1', role: 'USER' as const, source: 'USER_PROVIDED' as const, content: 'Pertanyaan lama', createdAt: at(2), turn: { status: 'SUCCEEDED' as const, createdAt: at(1), startedAt: at(8) } },
    ],
    pendingDraft: {
      id: 'draft-public', userId: 'hidden-owner', conversationId: 'hidden-conversation', status: 'PENDING_CONFIRMATION' as const,
      operation: 'transaction.create', transactionType: 'EXPENSE' as const, amount: { toString: () => '12500.50' },
      walletId: 'hidden-wallet', categoryId: 'hidden-category', transactionDate: at(5), description: 'Kopi',
      expiresAt: at(9), createdAt: at(5), updatedAt: at(5),
    },
    toolExecutions: [
      { id: 'execution-2', toolId: 'analytics.monthly-spending-summary', status: 'SUCCEEDED' as const, startedAt: at(7), outputSummary: { ID: 'hidden', requestID: 'hidden', transactionId: 'hidden', total: 10, paid: true, valid: true, nested: { correlationId: 'hidden', safe: true } } },
      { id: 'execution-1', toolId: 'transaction.create', status: 'FAILED' as const, startedAt: at(6), outputSummary: null },
    ],
    currentRequest: 'Tampilkan konteks saya',
  };
}

describe('Assistant context assembly', () => {
  it('maps rows to public DTOs in stable oldest-to-newest order', () => {
    const context = assembleAssistantContext(input());

    expect(context).toEqual({
      system: { contextVersion: '1', locale: 'id-ID' },
      conversation: { conversationId: 'conversation-public', createdAt: at(0).toISOString(), updatedAt: at(9).toISOString(), archived: false },
      turns: [
        { status: 'SUCCEEDED', timestamp: at(1).toISOString(), messages: [{ role: 'USER', content: 'Pertanyaan lama', source: 'USER_PROVIDED', timestamp: at(2).toISOString() }] },
        { status: 'SUCCEEDED', timestamp: at(3).toISOString(), messages: [{ role: 'ASSISTANT', content: 'Jawaban terbaru', source: 'DETERMINISTIC_RENDERER', timestamp: at(4).toISOString() }] },
      ],
      pendingDraft: {
        draftId: 'draft-public', operation: 'transaction.create', status: 'PENDING_CONFIRMATION',
        preview: { type: 'EXPENSE', amount: '12500.5', date: at(5).toISOString(), description: 'Kopi' },
        expiresAt: at(9).toISOString(), confirmationRequired: true,
      },
      toolExecutions: [
        { tool: 'transaction.create', status: 'FAILED', timestamp: at(6).toISOString() },
        { tool: 'analytics.monthly-spending-summary', status: 'SUCCEEDED', timestamp: at(7).toISOString(), safeOutputSummary: { nested: { safe: true }, paid: true, total: 10, valid: true } },
      ],
      currentRequest: { role: 'USER', content: 'Tampilkan konteks saya', source: 'CURRENT_REQUEST' },
    });
    expect(JSON.stringify(context)).not.toMatch(/hidden-owner|hidden-wallet|hidden-category|transactionId|correlationId|execution-\d|turn-\d|message-\d/);
  });

  it('serializes identical data identically with canonical summary key order', () => {
    const first = serializeAssistantContext(assembleAssistantContext(input()));
    const changedInsertionOrder = input();
    changedInsertionOrder.toolExecutions[0]!.outputSummary = { valid: true, nested: { safe: true, correlationId: 'hidden' }, paid: true, total: 10, transactionId: 'hidden', requestID: 'hidden', ID: 'hidden' };
    const second = serializeAssistantContext(assembleAssistantContext(changedInsertionOrder));

    expect(second).toBe(first);
    expect(first.indexOf('"system"')).toBeLessThan(first.indexOf('"conversation"'));
    expect(first.indexOf('"toolExecutions"')).toBeLessThan(first.indexOf('"pendingDraft"'));
    expect(first.indexOf('"pendingDraft"')).toBeLessThan(first.indexOf('"currentRequest"'));
    expect(first.match(/"currentRequest"/g)).toHaveLength(1);
  });

  it('enforces count limits using newest rows while preserving oldest-to-newest output', () => {
    const value = input();
    value.messages = Array.from({ length: 5 }, (_, index) => ({
      id: `m-${index}`, turnId: `t-${index}`, role: (index === 1 ? 'ASSISTANT' : 'USER') as 'USER' | 'ASSISTANT',
      source: 'USER_PROVIDED' as const, content: `message-${index}`, createdAt: at(index + 1),
      turn: { status: 'SUCCEEDED' as const, createdAt: at(index + 1), startedAt: at(index + 2) },
    })).reverse();

    const context = assembleAssistantContext(value, { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, messages: 2, turns: 2 });
    const contents = context.turns.flatMap((turn) => turn.messages.map((message) => message.content));

    expect(contents).toEqual(['message-1', 'message-4']);
  });

  it('trims oldest removable history to the byte limit and preserves protected entries', () => {
    const value = input();
    value.messages.unshift({ id: 'message-3', turnId: 'turn-3', role: 'USER', source: 'USER_PROVIDED', content: 'x'.repeat(500), createdAt: at(8), turn: { status: 'SUCCEEDED', createdAt: at(8), startedAt: at(9) } });
    const limits = { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, maxSerializedBytes: 1_200 };

    const context = assembleAssistantContext(value, limits);
    const serialized = serializeAssistantContext(context);

    expect(Buffer.byteLength(serialized, 'utf8')).toBeLessThanOrEqual(1_200);
    expect(serialized).toContain('Jawaban terbaru');
    expect(serialized).toContain('draft-public');
    expect(serialized).toContain('Tampilkan konteks saya');
    expect(serialized).not.toContain('Pertanyaan lama');
  });

  it('compares turn creation time with tool time when trimming across history kinds', () => {
    const value = input();
    const protectedAssistant = value.messages[0]!;
    value.messages = [
      { id: 'old-turn-message', turnId: 'old-turn', role: 'USER', source: 'USER_PROVIDED', content: 'old-turn'.repeat(80), createdAt: at(8), turn: { status: 'SUCCEEDED', createdAt: at(1), startedAt: at(9) } },
      protectedAssistant,
    ];
    value.toolExecutions = [{ id: 'middle-tool', toolId: 'keep-this-tool', status: 'SUCCEEDED', startedAt: at(6), outputSummary: null }];

    const context = assembleAssistantContext(value, { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, maxSerializedBytes: 1_200 });
    const serialized = serializeAssistantContext(context);

    expect(serialized).not.toContain('old-turnold-turn');
    expect(context.toolExecutions.map((tool) => tool.tool)).toContain('keep-this-tool');
  });

  it('fails deterministically when protected content alone exceeds the byte limit', () => {
    const value = input();
    value.currentRequest = 'x'.repeat(2_000);

    expect(() => assembleAssistantContext(value, { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, maxSerializedBytes: 1_024 }))
      .toThrow(AssistantError.contextTooLarge());
  });

  it.each([
    { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, messages: -1 },
    { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, turns: 0 },
    { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, toolExecutions: 1.5 },
    { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, pendingDrafts: 2 },
    { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, maxSerializedBytes: Number.NaN },
    { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, maxSerializedBytes: 1_023 },
  ])('rejects invalid context limits before assembly', (limits) => {
    expect(() => assembleAssistantContext(input(), limits))
      .toThrow(AssistantError.invalidContextConfiguration());
  });

  it('enforces the byte ceiling over UTF-8 JSON rather than JavaScript string length', () => {
    const value = input();
    value.messages = [];
    value.toolExecutions = [];
    value.pendingDraft = null;
    value.currentRequest = 'ASCII Indonesia: makan siang; multibyte: rupiah–hemat; emoji: 💰; JSON: "\\\n"'.repeat(20);
    const unbounded = assembleAssistantContext(value);
    const serialized = serializeAssistantContext(unbounded);
    const utf8Bytes = Buffer.byteLength(serialized, 'utf8');

    expect(utf8Bytes).toBeGreaterThan(serialized.length);
    expect(() => assembleAssistantContext(value, { ...DEFAULT_ASSISTANT_CONTEXT_LIMITS, maxSerializedBytes: utf8Bytes - 1 }))
      .toThrow(AssistantError.contextTooLarge());
    expect(Buffer.byteLength(serializeAssistantContext(assembleAssistantContext(value, {
      ...DEFAULT_ASSISTANT_CONTEXT_LIMITS,
      maxSerializedBytes: utf8Bytes,
    })), 'utf8')).toBe(utf8Bytes);
  });

  it('filters explicit sensitive keys recursively without broad substring matching', () => {
    const value = input();
    value.toolExecutions[0]!.outputSummary = Object.assign(JSON.parse('{"__proto__":{"polluted":true}}'), {
      userId: 'hidden', OWNER_ID: 'hidden', CorrelationId: 'hidden', idempotencyKey: 'hidden',
      policyDecision: 'hidden', risk: 'hidden', stack: 'hidden', sql: 'hidden', password: 'hidden',
      token: 'hidden', SECRET: 'hidden', api_key: 'hidden', accessToken: 'hidden', refresh_token: 'hidden',
      balance: 'hidden', constructor: 'hidden', prototype: 'hidden',
      nested: [{ apiKey: 'hidden', safe: 'kept' }], tokenCount: 3, riskAdjustedReturn: 'kept', balancedBudget: 'kept',
    });

    const serialized = serializeAssistantContext(assembleAssistantContext(value));
    const summary = assembleAssistantContext(value).toolExecutions[1]!.safeOutputSummary as object;

    expect(serialized).not.toContain('hidden');
    expect(Object.getPrototypeOf(summary)).toBe(Object.prototype);
    expect(serialized).toContain('"tokenCount":3');
    expect(serialized).toContain('"riskAdjustedReturn":"kept"');
    expect(serialized).toContain('"balancedBudget":"kept"');
    expect(serialized).toContain('"safe":"kept"');
  });

  it.each([
    new Date('2026-07-23T00:00:00Z'),
    1n,
    undefined,
    () => 'unsafe',
    Object.assign(Object.create(null), { safe: true }),
  ])('rejects unsupported safe-summary values deterministically', (unsupported) => {
    const value = input();
    value.toolExecutions[0]!.outputSummary = { unsupported };

    expect(() => assembleAssistantContext(value)).toThrow(AssistantError.unsupportedContextData());
  });

  it('rejects circular safe-summary values deterministically', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const value = input();
    value.toolExecutions[0]!.outputSummary = circular;

    expect(() => assembleAssistantContext(value)).toThrow(AssistantError.unsupportedContextData());
  });

  it.each([0, false, 'safe summary'])('preserves supported scalar safe-summary values', (safeSummary) => {
    const value = input();
    value.toolExecutions[0]!.outputSummary = safeSummary;

    expect(assembleAssistantContext(value).toolExecutions[1]!.safeOutputSummary).toBe(safeSummary);
  });
});
