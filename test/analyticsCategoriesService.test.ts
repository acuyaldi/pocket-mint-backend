import { afterEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createAnalyticsCategoriesService } from '../src/services/analytics-categories.service';
import { AnalyticsError } from '../src/services/analytics.errors';
import type { AnalyticsPrismaClient } from '../src/services/analytics-query.types';

const D = (n: number | string) => new Prisma.Decimal(n);
const USER = 'user-1';

function makeDb(over: { groupBy?: unknown[]; findMany?: unknown[] } = {}) {
  return {
    transaction: { groupBy: vi.fn(async () => over.groupBy ?? []) },
    category: { findMany: vi.fn(async () => over.findMany ?? []) },
  };
}

const svc = (db: unknown) => createAnalyticsCategoriesService(db as AnalyticsPrismaClient);

describe('analyticsCategoriesService.getCategoryBreakdown', () => {
  afterEach(() => vi.useRealTimers());

  it('rejects an invalid type', async () => {
    const db = makeDb();
    await expect(svc(db).getCategoryBreakdown({ userId: USER, type: 'TRANSFER' as never, period: 'current-month' })).rejects.toBeInstanceOf(
      AnalyticsError
    );
  });

  it('defaults to EXPENSE when type is omitted', async () => {
    const db = makeDb();
    const result = await svc(db).getCategoryBreakdown({ userId: USER, period: 'current-month' } as never);
    expect(result.type).toBe('EXPENSE');
    expect(db.transaction.groupBy.mock.calls[0][0].where.type).toBe('EXPENSE');
  });

  it('returns an empty breakdown (no category query) when there are no matching transactions', async () => {
    const db = makeDb({ groupBy: [] });
    const result = await svc(db).getCategoryBreakdown({ userId: USER, type: 'EXPENSE', period: 'current-month' });
    expect(result.categories).toEqual([]);
    expect(result.total.toString()).toBe('0');
    expect(db.category.findMany).not.toHaveBeenCalled();
  });

  it('groups a null categoryId into an explicit "Uncategorized" entry rather than dropping it', async () => {
    const db = makeDb({
      groupBy: [
        { categoryId: null, _sum: { amount: D('50000') }, _count: { _all: 2 } },
        { categoryId: 'cat-1', _sum: { amount: D('150000') }, _count: { _all: 3 } },
      ],
      findMany: [{ id: 'cat-1', name: 'Makan' }],
    });
    const result = await svc(db).getCategoryBreakdown({ userId: USER, type: 'EXPENSE', period: 'current-month' });

    const uncategorized = result.categories.find((c) => c.categoryId === null);
    expect(uncategorized).toBeDefined();
    expect(uncategorized?.name).toBe('Uncategorized');
    expect(uncategorized?.amount.toString()).toBe('50000');
  });

  it('orders categories by amount descending (stable)', async () => {
    const db = makeDb({
      groupBy: [
        { categoryId: 'cat-1', _sum: { amount: D('50000') }, _count: { _all: 1 } },
        { categoryId: 'cat-2', _sum: { amount: D('200000') }, _count: { _all: 1 } },
        { categoryId: 'cat-3', _sum: { amount: D('100000') }, _count: { _all: 1 } },
      ],
      findMany: [
        { id: 'cat-1', name: 'A' },
        { id: 'cat-2', name: 'B' },
        { id: 'cat-3', name: 'C' },
      ],
    });
    const result = await svc(db).getCategoryBreakdown({ userId: USER, type: 'EXPENSE', period: 'current-month' });
    expect(result.categories.map((c) => c.categoryId)).toEqual(['cat-2', 'cat-3', 'cat-1']);
  });

  it('computes exact percentage-of-total per category (Decimal division, unrounded)', async () => {
    const db = makeDb({
      groupBy: [
        { categoryId: 'cat-1', _sum: { amount: D('250000') }, _count: { _all: 1 } },
        { categoryId: 'cat-2', _sum: { amount: D('750000') }, _count: { _all: 1 } },
      ],
      findMany: [
        { id: 'cat-1', name: 'A' },
        { id: 'cat-2', name: 'B' },
      ],
    });
    const result = await svc(db).getCategoryBreakdown({ userId: USER, type: 'EXPENSE', period: 'current-month' });
    expect(result.total.toString()).toBe('1000000');
    expect(result.categories.find((c) => c.categoryId === 'cat-1')?.percentage?.toString()).toBe('25');
    expect(result.categories.find((c) => c.categoryId === 'cat-2')?.percentage?.toString()).toBe('75');
  });

  it('scopes the category name lookup to the caller (defense in depth against cross-user leakage)', async () => {
    const db = makeDb({ groupBy: [{ categoryId: 'cat-1', _sum: { amount: D('1000') }, _count: { _all: 1 } }] });
    await svc(db).getCategoryBreakdown({ userId: USER, type: 'EXPENSE', period: 'current-month' });
    const args = db.category.findMany.mock.calls[0][0];
    expect(args.where.userId).toBe(USER);
    expect(args.where.id).toEqual({ in: ['cat-1'] });
  });
});
