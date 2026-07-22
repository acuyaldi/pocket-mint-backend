// ============================================================
// Tests: tool contract validation (monthly-spending-summary)
// ============================================================
import { describe, expect, it } from 'vitest';
import { monthlySpendingSummary, AssistantError } from '../../src/assistant';

// ---- Tests: input validation -----------------------------------------------

describe('monthlySpendingSummary input validation', () => {
  it('accepts a valid YYYY-MM month string', () => {
    const result = monthlySpendingSummary.validateInput({ month: '2026-01' });
    expect(result).toEqual({ month: '2026-01' });
  });

  it('accepts December (12)', () => {
    const result = monthlySpendingSummary.validateInput({ month: '2026-12' });
    expect(result).toEqual({ month: '2026-12' });
  });

  it('accepts January with leading zero (01)', () => {
    const result = monthlySpendingSummary.validateInput({ month: '2026-01' });
    expect(result).toEqual({ month: '2026-01' });
  });

  it('rejects month 00', () => {
    expect(() =>
      monthlySpendingSummary.validateInput({ month: '2026-00' }),
    ).toThrow(AssistantError);
  });

  it('rejects month 13', () => {
    expect(() =>
      monthlySpendingSummary.validateInput({ month: '2026-13' }),
    ).toThrow(AssistantError);
  });

  it('rejects a malformed month string (no hyphen)', () => {
    expect(() =>
      monthlySpendingSummary.validateInput({ month: '202601' }),
    ).toThrow(AssistantError);
  });

  it('rejects a non-string month', () => {
    expect(() =>
      monthlySpendingSummary.validateInput({ month: 202601 }),
    ).toThrow(AssistantError);
  });

  it('rejects a missing month field', () => {
    expect(() => monthlySpendingSummary.validateInput({})).toThrow(
      AssistantError,
    );
  });

  it('rejects null input', () => {
    expect(() => monthlySpendingSummary.validateInput(null)).toThrow(
      AssistantError,
    );
  });

  it('rejects non-object input (string)', () => {
    expect(() =>
      monthlySpendingSummary.validateInput('2026-01'),
    ).toThrow(AssistantError);
  });

  it('rejects non-object input (array)', () => {
    expect(() => monthlySpendingSummary.validateInput(['2026-01'])).toThrow(
      AssistantError,
    );
  });

  it('input schema has no userId field — caller identity comes from ExecutionContext', () => {
    // Verify the validator does not accept or require a userId field.
    // The execution engine (Phase 21.2) supplies userId via ExecutionContext,
    // never from the tool input.
    expect(() =>
      monthlySpendingSummary.validateInput({ month: '2026-01', userId: 'hacker' }),
    ).not.toThrow();
    // The extra userId field is silently ignored — validation only cares about
    // the month field. The execution engine never merges tool input into context.
  });
});

// ---- Tests: output validation ----------------------------------------------

describe('monthlySpendingSummary output validation', () => {
  function makeValidOutput() {
    return {
      month: '2026-01',
      totalIncome: 5_000_000,
      totalExpense: 3_200_000,
      netSavings: 1_800_000,
      transactionCount: 42,
      topCategories: [
        { name: 'Food', amount: 1_200_000, percentage: 37.5 },
        { name: 'Transport', amount: 800_000, percentage: 25 },
      ],
    };
  }

  it('accepts a structurally valid output', () => {
    const output = makeValidOutput();
    const result = monthlySpendingSummary.validateOutput(output);
    expect(result).toEqual(output);
  });

  it('rejects output missing totalIncome', () => {
    const output = makeValidOutput();
    delete (output as Record<string, unknown>).totalIncome;
    expect(() => monthlySpendingSummary.validateOutput(output)).toThrow(
      AssistantError,
    );
  });

  it('rejects output missing topCategories array', () => {
    const output = makeValidOutput();
    delete (output as Record<string, unknown>).topCategories;
    expect(() => monthlySpendingSummary.validateOutput(output)).toThrow(
      AssistantError,
    );
  });

  it('rejects output with totalIncome as string instead of number', () => {
    const output = { ...makeValidOutput(), totalIncome: '5000000' };
    expect(() => monthlySpendingSummary.validateOutput(output)).toThrow(
      AssistantError,
    );
  });

  it('rejects null output', () => {
    expect(() => monthlySpendingSummary.validateOutput(null)).toThrow(
      AssistantError,
    );
  });

  it('rejects non-object output', () => {
    expect(() =>
      monthlySpendingSummary.validateOutput('not an object'),
    ).toThrow(AssistantError);
  });

  it('rejects NaN totalIncome', () => {
    const output = { ...makeValidOutput(), totalIncome: NaN };
    expect(() => monthlySpendingSummary.validateOutput(output)).toThrow(
      AssistantError,
    );
  });

  it('rejects Infinity totalExpense', () => {
    const output = { ...makeValidOutput(), totalExpense: Infinity };
    expect(() => monthlySpendingSummary.validateOutput(output)).toThrow(
      AssistantError,
    );
  });

  it('rejects -Infinity netSavings', () => {
    const output = { ...makeValidOutput(), netSavings: -Infinity };
    expect(() => monthlySpendingSummary.validateOutput(output)).toThrow(
      AssistantError,
    );
  });

  it('rejects non-integer transactionCount', () => {
    const output = { ...makeValidOutput(), transactionCount: 3.5 };
    expect(() => monthlySpendingSummary.validateOutput(output)).toThrow(
      AssistantError,
    );
  });

  it('rejects negative transactionCount', () => {
    const output = { ...makeValidOutput(), transactionCount: -1 };
    expect(() => monthlySpendingSummary.validateOutput(output)).toThrow(
      AssistantError,
    );
  });
});

// ---- Tests: contract metadata ----------------------------------------------

describe('monthlySpendingSummary contract metadata', () => {
  it('is an analytics read capability', () => {
    expect(monthlySpendingSummary.capability).toBe('analytics.read');
  });

  it('is LOW risk', () => {
    expect(monthlySpendingSummary.riskLevel).toBe('LOW');
  });

  it('requires no confirmation', () => {
    expect(monthlySpendingSummary.confirmationPolicy).toBe('NONE');
  });

  it('has a positive timeout', () => {
    expect(monthlySpendingSummary.timeoutMs).toBeGreaterThan(0);
  });

  it('is enabled', () => {
    expect(monthlySpendingSummary.enabled).toBe(true);
  });

  it('does not require idempotency (read is naturally idempotent)', () => {
    expect(monthlySpendingSummary.idempotencyPolicy).toBe('NOT_REQUIRED');
  });

  it('has a stable tool ID', () => {
    expect(monthlySpendingSummary.id).toBe('analytics.monthly-spending-summary');
  });

  it('has a human-readable description', () => {
    expect(monthlySpendingSummary.description.length).toBeGreaterThan(0);
  });

  it('does not import or reference any provider-specific type', () => {
    // Verify the contract shape contains no vendor-specific fields.
    // The ToolContract type ensures this at compile time; this test
    // verifies the runtime object has no accidental extras.
    const allowedKeys = new Set([
      'id', 'description', 'capability', 'riskLevel',
      'confirmationPolicy', 'idempotencyPolicy', 'timeoutMs',
      'enabled', 'validateInput', 'validateOutput',
    ]);
    for (const key of Object.keys(monthlySpendingSummary)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
  });
});
