import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

// The service module builds a default instance from the shared Prisma singleton
// at import time. Stub that singleton so importing the module doesn't construct a
// real client — every test injects its own fake via createBudgetQueryService.
vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createBudgetQueryService } from '../src/services/budget-query.service';
import { BudgetError } from '../src/services/budget.errors';
import type { BudgetQueryPrismaClient } from '../src/services/budget-query.types';

const D = (n: number | string) => new Prisma.Decimal(n);
const USER = 'user-1';

function makeBudget(over: Record<string, unknown> = {}) {
  return {
    id: 'budget-1',
    userId: USER,
    categoryId: 'cat-1',
    amount: D('1000000'),
    isArchived: false,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...over,
  };
}

function makeDb(over: { findFirst?: unknown; findMany?: unknown[]; aggregate?: unknown; groupBy?: unknown[] } = {}) {
  return {
    budget: {
      findFirst: vi.fn(async () => over.findFirst ?? null),
      findMany: vi.fn(async () => over.findMany ?? []),
    },
    transaction: {
      aggregate: vi.fn(async () => over.aggregate ?? { _sum: { amount: null } }),
      groupBy: vi.fn(async () => over.groupBy ?? []),
    },
  };
}

const svc = (db: unknown) => createBudgetQueryService(db as BudgetQueryPrismaClient);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const firstArg = (fn: any) => fn.mock.calls[0][0];

// Jakarta (reporting tz, UTC+7) half-open bounds for July 2026.
const JULY_2026 = { gte: '2026-06-30T17:00:00.000Z', lt: '2026-07-31T17:00:00.000Z' };

describe('budgetQueryService.getBudgetUsage', () => {
  afterEach(() => vi.useRealTimers());

  it('throws a typed 404 when the budget does not exist or is not owned by the caller', async () => {
    const db = makeDb({ findFirst: null });
    await expect(svc(db).getBudgetUsage({ userId: USER, budgetId: 'nope' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      isOperational: true,
    });
    await expect(svc(db).getBudgetUsage({ userId: USER, budgetId: 'nope' })).rejects.toBeInstanceOf(BudgetError);
    expect(db.transaction.aggregate).not.toHaveBeenCalled();
  });

  it('looks up the budget scoped to (id, userId) — cross-user lookup is structurally impossible', async () => {
    const db = makeDb({ findFirst: makeBudget() });
    await svc(db).getBudgetUsage({ userId: USER, budgetId: 'budget-1' });
    expect(firstArg(db.budget.findFirst)).toMatchObject({ where: { id: 'budget-1', userId: USER } });
  });

  it('includes the owning category (id/name/type) in one query, no per-row lookup', async () => {
    const db = makeDb({ findFirst: makeBudget() });
    await svc(db).getBudgetUsage({ userId: USER, budgetId: 'budget-1' });
    expect(firstArg(db.budget.findFirst).include).toEqual({ category: { select: { id: true, name: true, type: true } } });
  });

  it('exposes the resolved period bounds alongside usage', async () => {
    const db = makeDb({ findFirst: makeBudget() });
    const usage = await svc(db).getBudgetUsage({ userId: USER, budgetId: 'budget-1', month: 7, year: 2026 });
    expect(usage.periodStart.toISOString()).toBe(JULY_2026.gte);
    expect(usage.periodEnd.toISOString()).toBe(JULY_2026.lt);
  });

  it('aggregates EXPENSE transactions for the budget category within the half-open current reporting month', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00Z'));
    const db = makeDb({ findFirst: makeBudget(), aggregate: { _sum: { amount: D('300000') } } });

    const usage = await svc(db).getBudgetUsage({ userId: USER, budgetId: 'budget-1' });

    const args = firstArg(db.transaction.aggregate);
    expect(args.where).toMatchObject({ userId: USER, categoryId: 'cat-1', type: 'EXPENSE' });
    expect(args.where.date.gte.toISOString()).toBe(JULY_2026.gte);
    expect(args.where.date.lt.toISOString()).toBe(JULY_2026.lt);
    expect(args.where.date.lte).toBeUndefined(); // half-open, never lte
    expect(args._sum).toEqual({ amount: true });
    expect(usage.spent.toString()).toBe('300000');
  });

  it('resolves an explicit month/year window instead of the current month', async () => {
    const db = makeDb({ findFirst: makeBudget() });
    await svc(db).getBudgetUsage({ userId: USER, budgetId: 'budget-1', month: 7, year: 2026 });
    const where = firstArg(db.transaction.aggregate).where;
    expect(where.date.gte.toISOString()).toBe(JULY_2026.gte);
    expect(where.date.lt.toISOString()).toBe(JULY_2026.lt);
  });

  it('returns spent zero for a category with no matching expense', async () => {
    const db = makeDb({ findFirst: makeBudget(), aggregate: { _sum: { amount: null } } });
    const usage = await svc(db).getBudgetUsage({ userId: USER, budgetId: 'budget-1' });
    expect(usage.spent.toString()).toBe('0');
    expect(usage.spent).toBeInstanceOf(Prisma.Decimal);
    expect(usage.status).toBe('HEALTHY');
  });

  it('derives remaining/percentUsed/status via the shared calculation (not reimplemented here)', async () => {
    const db = makeDb({ findFirst: makeBudget({ amount: D('1000000') }), aggregate: { _sum: { amount: D('1000000') } } });
    const usage = await svc(db).getBudgetUsage({ userId: USER, budgetId: 'budget-1' });
    expect(usage.remaining.toString()).toBe('0');
    expect(usage.status).toBe('REACHED');
    expect(usage.budget.id).toBe('budget-1');
  });

  it('reports ARCHIVED status for an archived budget', async () => {
    const db = makeDb({ findFirst: makeBudget({ isArchived: true }), aggregate: { _sum: { amount: D('1500000') } } });
    const usage = await svc(db).getBudgetUsage({ userId: USER, budgetId: 'budget-1' });
    expect(usage.status).toBe('ARCHIVED');
  });

  it('propagates an unexpected database failure untyped', async () => {
    const db = makeDb({ findFirst: makeBudget() });
    db.transaction.aggregate = vi.fn(async () => { throw new Error('db exploded'); });
    await expect(svc(db).getBudgetUsage({ userId: USER, budgetId: 'budget-1' })).rejects.toThrow('db exploded');
  });
});

describe('budgetQueryService.listActiveBudgetUsage', () => {
  it('returns an empty array and issues no transaction query when the user has no budgets', async () => {
    const db = makeDb({ findMany: [] });
    const result = await svc(db).listActiveBudgetUsage({ userId: USER });
    expect(result).toEqual([]);
    expect(db.transaction.groupBy).not.toHaveBeenCalled();
  });

  it('scopes the budget list to the caller and excludes archived budgets', async () => {
    const db = makeDb({ findMany: [] });
    await svc(db).listActiveBudgetUsage({ userId: USER });
    expect(firstArg(db.budget.findMany)).toMatchObject({ where: { userId: USER, isArchived: false } });
  });

  it('aggregates every active budget in ONE grouped query, never one per budget (N+1 avoidance)', async () => {
    const budgets = [makeBudget({ id: 'b1', categoryId: 'cat-1' }), makeBudget({ id: 'b2', categoryId: 'cat-2' }), makeBudget({ id: 'b3', categoryId: 'cat-3' })];
    const db = makeDb({
      findMany: budgets,
      groupBy: [
        { categoryId: 'cat-1', _sum: { amount: D('300000') } },
        { categoryId: 'cat-2', _sum: { amount: D('900000') } },
      ],
    });

    const result = await svc(db).listActiveBudgetUsage({ userId: USER });

    expect(db.transaction.groupBy).toHaveBeenCalledTimes(1);
    const args = firstArg(db.transaction.groupBy);
    expect(args.by).toEqual(['categoryId']);
    expect(args.where).toMatchObject({ userId: USER, type: 'EXPENSE', categoryId: { in: ['cat-1', 'cat-2', 'cat-3'] } });

    expect(result).toHaveLength(3);
    expect(result.find((r) => r.budget.id === 'b1')?.spent.toString()).toBe('300000');
    expect(result.find((r) => r.budget.id === 'b2')?.spent.toString()).toBe('900000');
    expect(result.find((r) => r.budget.id === 'b3')?.spent.toString()).toBe('0'); // category with no expense
  });

  it('scopes the aggregation to the current reporting month by default', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00Z'));
    const db = makeDb({ findMany: [makeBudget()] });
    await svc(db).listActiveBudgetUsage({ userId: USER });
    const where = firstArg(db.transaction.groupBy).where;
    expect(where.date.gte.toISOString()).toBe(JULY_2026.gte);
    expect(where.date.lt.toISOString()).toBe(JULY_2026.lt);
    vi.useRealTimers();
  });

  it('propagates an unexpected database failure untyped', async () => {
    const db = makeDb({ findMany: [makeBudget()] });
    db.transaction.groupBy = vi.fn(async () => { throw new Error('boom'); });
    await expect(svc(db).listActiveBudgetUsage({ userId: USER })).rejects.toThrow('boom');
  });

  it('lists archived budgets instead of active ones when status is "archived"', async () => {
    const db = makeDb({ findMany: [] });
    await svc(db).listActiveBudgetUsage({ userId: USER, status: 'archived' });
    expect(firstArg(db.budget.findMany)).toMatchObject({ where: { userId: USER, isArchived: true } });
  });

  it('defaults to active budgets when status is omitted', async () => {
    const db = makeDb({ findMany: [] });
    await svc(db).listActiveBudgetUsage({ userId: USER });
    expect(firstArg(db.budget.findMany)).toMatchObject({ where: { userId: USER, isArchived: false } });
  });
});
