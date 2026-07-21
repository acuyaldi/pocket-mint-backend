import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createAnalyticsOverviewService } from '../src/services/analytics-overview.service';
import { AnalyticsError } from '../src/services/analytics.errors';
import type { AnalyticsPrismaClient } from '../src/services/analytics-query.types';

const D = (n: number | string) => new Prisma.Decimal(n);
const USER = 'user-1';

function makeDb(groupByResults: unknown[][]) {
  const groupBy = vi.fn();
  for (const result of groupByResults) groupBy.mockResolvedValueOnce(result);
  return { transaction: { groupBy } };
}

const svc = (db: unknown) => createAnalyticsOverviewService(db as AnalyticsPrismaClient);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nthArg = (fn: any, n: number) => fn.mock.calls[n][0];

describe('analyticsOverviewService.getOverview', () => {
  afterEach(() => vi.useRealTimers());

  it('rejects an invalid period as a typed 400 AnalyticsError', async () => {
    const db = makeDb([[], []]);
    await expect(svc(db).getOverview({ userId: USER, period: 'nonsense' })).rejects.toBeInstanceOf(AnalyticsError);
    await expect(svc(db).getOverview({ userId: USER, period: 'nonsense' })).rejects.toMatchObject({ statusCode: 400, isOperational: true });
  });

  it('computes income, expense, netCashFlow, and transactionCount from grouped sums (transfers excluded by the where clause)', async () => {
    const db = makeDb([
      [
        { type: 'INCOME', _sum: { amount: D('5000000') }, _count: { _all: 3 } },
        { type: 'EXPENSE', _sum: { amount: D('2000000') }, _count: { _all: 5 } },
      ],
      [],
    ]);
    const result = await svc(db).getOverview({ userId: USER, period: 'current-month' });

    expect(result.income.toString()).toBe('5000000');
    expect(result.expense.toString()).toBe('2000000');
    expect(result.netCashFlow.toString()).toBe('3000000');
    expect(result.transactionCount).toBe(8);

    const currentWhere = nthArg(db.transaction.groupBy, 0).where;
    expect(currentWhere.userId).toBe(USER);
    expect(currentWhere.type).toEqual({ in: ['INCOME', 'EXPENSE'] });
  });

  it('returns all zeros for an empty dataset, never throwing on division', async () => {
    const db = makeDb([[], []]);
    const result = await svc(db).getOverview({ userId: USER, period: 'current-month' });
    expect(result.income.toString()).toBe('0');
    expect(result.expense.toString()).toBe('0');
    expect(result.netCashFlow.toString()).toBe('0');
    expect(result.transactionCount).toBe(0);
    expect(result.percentageChange.income).toEqual({ value: null, reason: 'ZERO_BASELINE' });
  });

  it('computes an exact percentage change against a non-zero previous period', async () => {
    const db = makeDb([
      [{ type: 'INCOME', _sum: { amount: D('1500000') }, _count: { _all: 1 } }],
      [{ type: 'INCOME', _sum: { amount: D('1000000') } }],
    ]);
    const result = await svc(db).getOverview({ userId: USER, period: 'current-month' });
    expect(result.change.income.toString()).toBe('500000');
    expect((result.percentageChange.income as { value: Prisma.Decimal }).value.toString()).toBe('50');
  });

  it('returns an explicit ZERO_BASELINE marker (never Infinity/NaN) when the previous period is exactly zero', async () => {
    const db = makeDb([
      [{ type: 'INCOME', _sum: { amount: D('1000000') }, _count: { _all: 1 } }],
      [],
    ]);
    const result = await svc(db).getOverview({ userId: USER, period: 'current-month' });
    expect(result.percentageChange.income).toEqual({ value: null, reason: 'ZERO_BASELINE' });
    expect(result.change.income.toString()).toBe('1000000');
  });

  it('handles an income-only period (expense stays exact zero)', async () => {
    const db = makeDb([[{ type: 'INCOME', _sum: { amount: D('999999999.99') }, _count: { _all: 1 } }], []]);
    const result = await svc(db).getOverview({ userId: USER, period: 'current-month' });
    expect(result.income.toString()).toBe('999999999.99');
    expect(result.expense.toString()).toBe('0');
    expect(result.netCashFlow.toString()).toBe('999999999.99');
  });

  it('handles an expense-only period (income stays exact zero, net negative)', async () => {
    const db = makeDb([[{ type: 'EXPENSE', _sum: { amount: D('1234.56') }, _count: { _all: 2 } }], []]);
    const result = await svc(db).getOverview({ userId: USER, period: 'current-month' });
    expect(result.income.toString()).toBe('0');
    expect(result.expense.toString()).toBe('1234.56');
    expect(result.netCashFlow.toString()).toBe('-1234.56');
  });

  it('exposes the resolved effective period bounds and the previous-period bounds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00Z'));
    const db = makeDb([[], []]);
    const result = await svc(db).getOverview({ userId: USER, period: 'current-month' });
    expect(result.periodStart.toISOString()).toBe('2026-06-30T17:00:00.000Z');
    expect(result.periodEnd.toISOString()).toBe('2026-07-31T17:00:00.000Z');
    expect(result.previous.periodStart.toISOString()).toBe('2026-05-31T17:00:00.000Z');
    expect(result.previous.periodEnd.toISOString()).toBe('2026-06-30T17:00:00.000Z');
  });
});
