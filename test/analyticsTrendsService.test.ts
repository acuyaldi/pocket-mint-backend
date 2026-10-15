import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createAnalyticsTrendsService } from '../src/services/analytics-trends.service';
import type { AnalyticsPrismaClient } from '../src/services/analytics-query.types';

const D = (n: number | string) => new Prisma.Decimal(n);
const USER = 'user-1';

function makeDb(rows: { date: Date; type: string; amount: Prisma.Decimal }[]) {
  return { transaction: { findMany: vi.fn(async () => rows) } };
}

const svc = (db: unknown) => createAnalyticsTrendsService(db as AnalyticsPrismaClient);

describe('analyticsTrendsService.getTrends', () => {
  afterEach(() => vi.useRealTimers());

  it('zero-fills every bucket for a period with no transactions (continuous series, no gaps)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00Z'));
    const db = makeDb([]);
    const result = await svc(db).getTrends({ userId: USER, period: 'current-month' });

    expect(result.granularity).toBe('day');
    expect(result.buckets).toHaveLength(31);
    for (const b of result.buckets) {
      expect(b.income.toString()).toBe('0');
      expect(b.expense.toString()).toBe('0');
      expect(b.netCashFlow.toString()).toBe('0');
    }
    for (let i = 1; i < result.buckets.length; i++) {
      expect(result.buckets[i].start.getTime()).toBe(result.buckets[i - 1].end.getTime());
    }
  });

  it('folds INCOME/EXPENSE rows into the correct daily bucket and excludes nothing but what the query already filtered', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00Z'));
    const db = makeDb([
      { date: new Date('2026-07-01T01:00:00.000Z'), type: 'INCOME', amount: D('100000') }, // Jul 1 Jakarta 08:00
      { date: new Date('2026-07-01T10:00:00.000Z'), type: 'EXPENSE', amount: D('30000') }, // Jul 1 Jakarta 17:00
      { date: new Date('2026-07-05T00:00:00.000Z'), type: 'INCOME', amount: D('50000') },
    ]);
    const result = await svc(db).getTrends({ userId: USER, period: 'current-month' });

    const jul1 = result.buckets.find((b) => b.start.toISOString() === '2026-06-30T17:00:00.000Z');
    expect(jul1?.income.toString()).toBe('100000');
    expect(jul1?.expense.toString()).toBe('30000');
    expect(jul1?.netCashFlow.toString()).toBe('70000');

    const totalIncome = result.buckets.reduce((sum, b) => sum.plus(b.income), new Prisma.Decimal(0));
    expect(totalIncome.toString()).toBe('150000');
  });

  it('switches to monthly buckets for a period longer than 62 days', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00Z'));
    const db = makeDb([]);
    const result = await svc(db).getTrends({ userId: USER, period: 'last-6-months' });
    expect(result.granularity).toBe('month');
    expect(result.buckets).toHaveLength(6);
  });

  it('scopes the underlying query to userId and INCOME/EXPENSE only, never TRANSFER', async () => {
    const db = makeDb([]);
    await svc(db).getTrends({ userId: USER, period: 'current-month' });
    const where = db.transaction.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe(USER);
    expect(where.type).toEqual({ in: ['INCOME', 'EXPENSE'] });
  });
});
