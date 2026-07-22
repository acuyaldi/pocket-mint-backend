import { describe, expect, it } from 'vitest';
import {
  normalizeProvidedMessage,
  safeRejectedUserMessage,
  monthlySummaryFallback,
  monthlySummaryInputForAudit,
  monthlySummaryOutputForAudit,
} from '../../src/assistant/persistence';

describe('Assistant persistence projections', () => {
  it('treats empty and whitespace-only messages as absent', () => {
    expect(normalizeProvidedMessage(undefined)).toBeUndefined();
    expect(normalizeProvidedMessage('   \n')).toBeUndefined();
  });

  it('trims provided messages and rejects non-strings or oversized content', () => {
    expect(normalizeProvidedMessage('  Halo  ')).toBe('Halo');
    expect(() => normalizeProvidedMessage(42)).toThrow(/string/i);
    expect(() => normalizeProvidedMessage('x'.repeat(100_001))).toThrow(/100000/);
  });

  it('builds fallback and audit input only from validated monthly arguments', () => {
    const input = { month: '2026-07' };
    expect(monthlySummaryFallback(input)).toBe('analytics.monthly-spending-summary(month=2026-07)');
    expect(monthlySummaryInputForAudit(input)).toEqual(input);
  });

  it('uses a constant safe rejected summary and minimizes output', () => {
    expect(safeRejectedUserMessage()).toBe('Permintaan Assistant tidak dapat diproses.');
    expect(monthlySummaryOutputForAudit({
      month: '2026-07', totalIncome: 1, totalExpense: 2, netSavings: -1,
      transactionCount: 42, topCategories: [{ name: 'Food', amount: 2, percentage: 100 }],
    })).toEqual({ month: '2026-07', transactionCount: 42, categoryCount: 1 });
  });
});
