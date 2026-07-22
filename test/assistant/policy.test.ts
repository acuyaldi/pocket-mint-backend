// ============================================================
// Tests: evaluatePolicy
// ============================================================
import { describe, expect, it } from 'vitest';
import { evaluatePolicy, AssistantError } from '../../src/assistant';
import type { ToolContract } from '../../src/assistant';

// ---- Helpers ---------------------------------------------------------------

function makeTool(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test.tool',
    description: 'Test',
    capability: 'test.read',
    riskLevel: 'LOW' as const,
    confirmationPolicy: 'NONE' as const,
    idempotencyPolicy: 'NOT_REQUIRED' as const,
    timeoutMs: 5_000,
    enabled: true,
    validateInput: (i: unknown) => i,
    validateOutput: (o: unknown) => o,
    ...overrides,
  } satisfies ToolContract;
}

// ---- Tests -----------------------------------------------------------------

describe('evaluatePolicy', () => {
  it('Low-risk NONE tool executes immediately', () => {
    const tool = makeTool({ riskLevel: 'LOW', confirmationPolicy: 'NONE' });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('EXECUTE_IMMEDIATELY');
  });

  it('Low-risk EXPLICIT tool requires draft and confirmation (strengthened)', () => {
    const tool = makeTool({ riskLevel: 'LOW', confirmationPolicy: 'EXPLICIT' });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('DRAFT_AND_CONFIRM');
  });

  it('Medium-risk EXPLICIT tool requires draft and confirmation', () => {
    const tool = makeTool({ riskLevel: 'MEDIUM', confirmationPolicy: 'EXPLICIT' });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('DRAFT_AND_CONFIRM');
  });

  it('High-risk EXPLICIT tool requires draft and confirmation (not step-up)', () => {
    const tool = makeTool({ riskLevel: 'HIGH', confirmationPolicy: 'EXPLICIT' });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('DRAFT_AND_CONFIRM');
  });

  it('High-risk STEP_UP tool requires step-up confirmation (strengthened)', () => {
    const tool = makeTool({ riskLevel: 'HIGH', confirmationPolicy: 'STEP_UP' });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('STEP_UP_REQUIRED');
  });

  it('Medium-risk STEP_UP tool requires step-up confirmation (strengthened)', () => {
    const tool = makeTool({ riskLevel: 'MEDIUM', confirmationPolicy: 'STEP_UP' });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('STEP_UP_REQUIRED');
  });

  it('Very High-risk tool is unavailable', () => {
    const tool = makeTool({ riskLevel: 'VERY_HIGH', confirmationPolicy: 'DISABLED' });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('UNAVAILABLE');
    expect(result.reason).toBeDefined();
  });

  it('disabled tool is unavailable regardless of risk', () => {
    const tool = makeTool({ riskLevel: 'LOW', enabled: false });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('UNAVAILABLE');
    expect(result.reason).toContain('disabled');
  });

  it('disabled Very High-risk tool is unavailable (disabled takes priority)', () => {
    const tool = makeTool({ riskLevel: 'VERY_HIGH', enabled: false });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('UNAVAILABLE');
    expect(result.reason).toContain('disabled');
  });

  it('DISABLED confirmation policy is unavailable', () => {
    const tool = makeTool({ riskLevel: 'LOW', confirmationPolicy: 'DISABLED' });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('UNAVAILABLE');
  });

  it('EXECUTE_IMMEDIATELY result has no reason field', () => {
    const tool = makeTool({ riskLevel: 'LOW', confirmationPolicy: 'NONE' });
    const result = evaluatePolicy(tool);
    expect(result).toEqual({ action: 'EXECUTE_IMMEDIATELY' });
  });

  it('UNAVAILABLE result always carries a reason', () => {
    const tool = makeTool({ riskLevel: 'VERY_HIGH', confirmationPolicy: 'DISABLED' });
    const result = evaluatePolicy(tool);
    if (result.action === 'UNAVAILABLE') {
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it('LOW + STEP_UP requires step-up confirmation', () => {
    const tool = makeTool({ riskLevel: 'LOW', confirmationPolicy: 'STEP_UP' });
    const result = evaluatePolicy(tool);
    expect(result.action).toBe('STEP_UP_REQUIRED');
  });

  it('evaluatePolicy does not throw for any valid risk level', () => {
    const levels: Array<{ risk: string; confirmation: string }> = [
      { risk: 'LOW', confirmation: 'NONE' },
      { risk: 'MEDIUM', confirmation: 'EXPLICIT' },
      { risk: 'HIGH', confirmation: 'EXPLICIT' },
      { risk: 'VERY_HIGH', confirmation: 'DISABLED' },
    ];
    for (const { risk, confirmation } of levels) {
      const tool = makeTool({ riskLevel: risk, confirmationPolicy: confirmation });
      expect(() => evaluatePolicy(tool)).not.toThrow();
    }
  });
});

// ---- Table-driven: every valid and invalid combination ------------------------

describe('evaluatePolicy — full risk/confirmation matrix', () => {
  // Valid combinations (evaluatePolicy returns an action)
  const valid: Array<{
    risk: string;
    confirmation: string;
    action: string;
    enabled?: boolean;
  }> = [
    { risk: 'LOW', confirmation: 'NONE', action: 'EXECUTE_IMMEDIATELY' },
    { risk: 'LOW', confirmation: 'EXPLICIT', action: 'DRAFT_AND_CONFIRM' },
    { risk: 'LOW', confirmation: 'STEP_UP', action: 'STEP_UP_REQUIRED' },
    { risk: 'LOW', confirmation: 'DISABLED', action: 'UNAVAILABLE' },
    { risk: 'MEDIUM', confirmation: 'EXPLICIT', action: 'DRAFT_AND_CONFIRM' },
    { risk: 'MEDIUM', confirmation: 'STEP_UP', action: 'STEP_UP_REQUIRED' },
    { risk: 'HIGH', confirmation: 'EXPLICIT', action: 'DRAFT_AND_CONFIRM' },
    { risk: 'HIGH', confirmation: 'STEP_UP', action: 'STEP_UP_REQUIRED' },
    { risk: 'VERY_HIGH', confirmation: 'DISABLED', action: 'UNAVAILABLE' },
    // disabled overrides everything
    { risk: 'LOW', confirmation: 'NONE', action: 'UNAVAILABLE', enabled: false },
  ];

  // Invalid combinations (rejected at registration — these should never
  // reach evaluatePolicy; we document them here for completeness).
  // MEDIUM + NONE, HIGH + NONE, VERY_HIGH + anything-except-DISABLED
  // are rejected by ToolRegistry.validateInvariants, not evaluatePolicy.

  for (const tc of valid) {
    it(`${tc.risk} + ${tc.confirmation}${tc.enabled === false ? ' (disabled)' : ''} → ${tc.action}`, () => {
      const tool = makeTool({
        riskLevel: tc.risk,
        confirmationPolicy: tc.confirmation,
        ...(tc.enabled === false ? { enabled: false } : {}),
      });
      const result = evaluatePolicy(tool);
      expect(result.action).toBe(tc.action);
    });
  }
});
