import { describe, it, expect } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { computeBudgetUsage } from '../src/domain/budget';

const D = (n: number | string) => new Prisma.Decimal(n);

describe('computeBudgetUsage — status boundaries (budgeting-calculation-spec.md §5)', () => {
  const cases: Array<[string, string, string, string]> = [
    // [spent, amount, expected percentUsed, expected status]
    ['0', '1000000', '0', 'HEALTHY'],
    ['749999', '1000000', '74.9999', 'HEALTHY'],
    ['750000', '1000000', '75', 'APPROACHING'],
    ['999999', '1000000', '99.9999', 'APPROACHING'],
    ['1000000', '1000000', '100', 'REACHED'],
    ['1000001', '1000000', '100.0001', 'EXCEEDED'],
    ['1500000', '1000000', '150', 'EXCEEDED'],
  ];

  it.each(cases)('spent=%s amount=%s -> percentUsed=%s status=%s', (spent, amount, percent, status) => {
    const result = computeBudgetUsage(D(amount), D(spent), false);
    expect(result.percentUsed?.toString()).toBe(percent);
    expect(result.status).toBe(status);
  });

  it('is ARCHIVED regardless of percentUsed when the Budget is archived', () => {
    expect(computeBudgetUsage(D('1000000'), D('0'), true).status).toBe('ARCHIVED');
    expect(computeBudgetUsage(D('1000000'), D('1500000'), true).status).toBe('ARCHIVED');
  });

  it('evaluates EXCEEDED before REACHED before APPROACHING, so exactly 100% is never misreported', () => {
    const result = computeBudgetUsage(D('1000000'), D('1000000'), false);
    expect(result.status).not.toBe('APPROACHING');
    expect(result.status).not.toBe('EXCEEDED');
    expect(result.status).toBe('REACHED');
  });
});

describe('computeBudgetUsage — monetary calculations', () => {
  it('spent is the aggregated amount passed in, unchanged', () => {
    const result = computeBudgetUsage(D('1000000'), D('300000'), false);
    expect(result.spent.toString()).toBe('300000');
  });

  it('remaining is positive below budget', () => {
    const result = computeBudgetUsage(D('1000000'), D('300000'), false);
    expect(result.remaining.toString()).toBe('700000');
  });

  it('remaining is zero at exactly the budget', () => {
    const result = computeBudgetUsage(D('1000000'), D('1000000'), false);
    expect(result.remaining.toString()).toBe('0');
  });

  it('remaining is negative above budget and never clamped to zero', () => {
    const result = computeBudgetUsage(D('1000000'), D('1500000'), false);
    expect(result.remaining.toString()).toBe('-500000');
  });

  it('preserves Decimal precision (no float drift)', () => {
    const result = computeBudgetUsage(D('3000000'), D('1000000'), false);
    // 1,000,000 / 3,000,000 * 100 = 33.333... exact Decimal division, not a
    // rounded float approximation.
    expect(result.percentUsed?.toString()).toBe('33.333333333333333333');
  });

  it('authoritative status does not depend on display rounding (74.9999% never rounds up to a false 75% boundary)', () => {
    const result = computeBudgetUsage(D('1000000'), D('749999'), false);
    expect(result.status).toBe('HEALTHY'); // would be APPROACHING if rounded to 75% first
  });

  it('defines zero-budget behavior defensively (amount <= 0 is unreachable via validated creation)', () => {
    const noSpend = computeBudgetUsage(D('0'), D('0'), false);
    expect(noSpend.status).toBe('HEALTHY');
    expect(noSpend.percentUsed).toBeNull();

    const withSpend = computeBudgetUsage(D('0'), D('1'), false);
    expect(withSpend.status).toBe('EXCEEDED');
    expect(withSpend.percentUsed).toBeNull();
  });
});
