// ============================================================
// Tests: intent resolver
// ============================================================
import { describe, expect, it } from 'vitest';
import { resolveIntent, AssistantError } from '../../src/assistant';
import type { AssistantCanonicalRequest } from '../../src/assistant';

function makeRequest(
  overrides: Partial<AssistantCanonicalRequest> = {},
): AssistantCanonicalRequest {
  return {
    intent: 'analytics.monthly-spending-summary',
    arguments: { month: '2026-07' },
    ...overrides,
  };
}

describe('resolveIntent', () => {
  it('resolves a supported intent to the corresponding tool ID', () => {
    const result = resolveIntent(makeRequest());
    expect(result.toolId).toBe('analytics.monthly-spending-summary');
    expect(result.arguments).toEqual({ month: '2026-07' });
  });

  it('rejects an unsupported intent', () => {
    expect(() =>
      resolveIntent(makeRequest({ intent: 'transaction.delete' })),
    ).toThrow(AssistantError);

    try {
        resolveIntent(makeRequest({ intent: 'transaction.delete' }));
    } catch (err) {
      expect(err).toBeInstanceOf(AssistantError);
      expect((err as AssistantError).statusCode).toBe(400);
      expect((err as AssistantError).code).toBe('ASSISTANT_UNSUPPORTED_INTENT');
    }
  });

  it('passes through arguments unchanged (validation is the tool contract\'s job)', () => {
    const result = resolveIntent(
      makeRequest({ arguments: { month: 'bad-month' } }),
    );
    expect(result.arguments).toEqual({ month: 'bad-month' });
  });

  it('handles null arguments', () => {
    const result = resolveIntent(makeRequest({ arguments: null }));
    expect(result.arguments).toBeNull();
  });
});
