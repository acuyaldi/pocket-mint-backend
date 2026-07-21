import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

// The service module builds a default instance from the shared Prisma singleton
// at import time. Stub that singleton so importing the module doesn't construct a
// real client — every test injects its own fake via createBudgetService.
vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createBudgetService } from '../src/services/budget.service';
import { BudgetError } from '../src/services/budget.errors';
import type { BudgetCommandPrismaClient } from '../src/services/budget.types';

const D = (n: number | string) => new Prisma.Decimal(n);
const USER = 'user-1';
const OTHER_USER = 'user-2';

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

function makeCategory(over: Record<string, unknown> = {}) {
  return {
    id: 'cat-1',
    userId: USER,
    name: 'Groceries',
    type: 'EXPENSE',
    icon: null,
    color: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  };
}

function makeDb(over: {
  budgetFindFirst?: unknown;
  categoryFindFirst?: unknown;
  budgetCreate?: (args: unknown) => unknown;
  budgetUpdate?: (args: unknown) => unknown;
} = {}) {
  return {
    budget: {
      findFirst: vi.fn(async () => over.budgetFindFirst ?? null),
      create: vi.fn(async (args: unknown) => (over.budgetCreate ? over.budgetCreate(args) : { id: 'new-budget', ...(args as { data: object }).data, isArchived: false })),
      update: vi.fn(async (args: unknown) => (over.budgetUpdate ? over.budgetUpdate(args) : { ...makeBudget(), ...(args as { data: object }).data })),
    },
    category: {
      findFirst: vi.fn(async () => over.categoryFindFirst ?? null),
    },
  };
}

const svc = (db: unknown) => createBudgetService(db as BudgetCommandPrismaClient);

describe('budgetService.createBudget', () => {
  it('creates a budget for a valid user-owned EXPENSE category with a valid amount, active by default', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory(), budgetFindFirst: null });
    const result = await svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: '500000.50' });

    expect(db.budget.create).toHaveBeenCalledWith({
      data: { userId: USER, categoryId: 'cat-1', amount: expect.objectContaining({ toString: expect.any(Function) }) },
    });
    expect(result.isArchived).toBe(false);
    const createArgs = db.budget.create.mock.calls[0][0];
    expect(createArgs.data.amount.toString()).toBe('500000.5');
  });

  it('rejects a missing amount', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: undefined as unknown as string })).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('rejects a malformed amount string', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: 'not-a-number' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('rejects a zero amount', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: 0 })).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_AMOUNT',
    });
  });

  it('rejects a negative amount', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: -100 })).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_AMOUNT',
    });
  });

  it('rejects an amount with more than 2 decimal places', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: '100.123' })).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_AMOUNT',
    });
  });

  it('rejects an amount exceeding Decimal(15,2) storage range', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory() });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: '99999999999999.99' })).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_AMOUNT',
    });
  });

  it('rejects a nonexistent category', async () => {
    const db = makeDb({ categoryFindFirst: null });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'ghost', amount: 100 })).rejects.toMatchObject({
      statusCode: 404,
      code: 'CATEGORY_NOT_FOUND',
    });
  });

  it('treats another user\'s category as not found (no ownership leak)', async () => {
    const db = makeDb({ categoryFindFirst: null }); // findFirst scoped by (id, userId) never returns it
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'other-users-cat', amount: 100 })).rejects.toMatchObject({
      statusCode: 404,
      code: 'CATEGORY_NOT_FOUND',
    });
    expect(db.category.findFirst).toHaveBeenCalledWith({ where: { id: 'other-users-cat', userId: USER } });
  });

  it('rejects a non-expense (INCOME) category', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory({ type: 'INCOME' }) });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: 100 })).rejects.toMatchObject({
      statusCode: 422,
      code: 'CATEGORY_NOT_EXPENSE',
    });
  });

  it('rejects a duplicate active budget', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory(), budgetFindFirst: makeBudget({ isArchived: false }) });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: 100 })).rejects.toMatchObject({
      statusCode: 409,
      code: 'BUDGET_ALREADY_EXISTS',
    });
    expect(db.budget.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate archived budget without silently restoring it', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory(), budgetFindFirst: makeBudget({ isArchived: true }) });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: 100 })).rejects.toMatchObject({
      statusCode: 409,
      code: 'BUDGET_ALREADY_EXISTS',
    });
    expect(db.budget.create).not.toHaveBeenCalled();
    expect(db.budget.update).not.toHaveBeenCalled();
  });

  it('translates a Prisma P2002 unique-constraint race into BudgetAlreadyExists without leaking the raw error', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory(), budgetFindFirst: null });
    db.budget.create = vi.fn(async () => {
      const err = new Error('Unique constraint failed') as Error & { code: string };
      err.code = 'P2002';
      throw err;
    });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: 100 })).rejects.toMatchObject({
      statusCode: 409,
      code: 'BUDGET_ALREADY_EXISTS',
      isOperational: true,
    });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: 100 })).rejects.toBeInstanceOf(BudgetError);
  });

  it('propagates an unrelated database failure untyped', async () => {
    const db = makeDb({ categoryFindFirst: makeCategory(), budgetFindFirst: null });
    db.budget.create = vi.fn(async () => {
      throw new Error('db exploded');
    });
    await expect(svc(db).createBudget({ userId: USER, categoryId: 'cat-1', amount: 100 })).rejects.toThrow('db exploded');
  });
});

describe('budgetService.updateBudgetAmount', () => {
  it('updates the amount successfully, preserving Decimal precision', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget() });
    const result = await svc(db).updateBudgetAmount({ userId: USER, budgetId: 'budget-1', amount: '750000.25' });
    const updateArgs = db.budget.update.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: 'budget-1' });
    expect(updateArgs.data.amount.toString()).toBe('750000.25');
    expect(result).toBeDefined();
  });

  it('rejects a zero amount', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget() });
    await expect(svc(db).updateBudgetAmount({ userId: USER, budgetId: 'budget-1', amount: 0 })).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_AMOUNT',
    });
  });

  it('rejects a negative amount', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget() });
    await expect(svc(db).updateBudgetAmount({ userId: USER, budgetId: 'budget-1', amount: -50 })).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_AMOUNT',
    });
  });

  it('rejects a malformed amount', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget() });
    await expect(svc(db).updateBudgetAmount({ userId: USER, budgetId: 'budget-1', amount: 'garbage' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('rejects an amount with more than 2 decimal places', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget() });
    await expect(svc(db).updateBudgetAmount({ userId: USER, budgetId: 'budget-1', amount: '1.999' })).rejects.toMatchObject({
      statusCode: 422,
      code: 'INVALID_AMOUNT',
    });
  });

  it('treats another user\'s budget as not found', async () => {
    const db = makeDb({ budgetFindFirst: null }); // findFirst scoped by (id, userId)
    await expect(svc(db).updateBudgetAmount({ userId: OTHER_USER, budgetId: 'budget-1', amount: 100 })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('rejects a nonexistent budget', async () => {
    const db = makeDb({ budgetFindFirst: null });
    await expect(svc(db).updateBudgetAmount({ userId: USER, budgetId: 'ghost', amount: 100 })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('allows updating the amount of an archived budget (per the API contract)', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget({ isArchived: true }) });
    const updateArgs0 = db.budget.update;
    await svc(db).updateBudgetAmount({ userId: USER, budgetId: 'budget-1', amount: 200000 });
    expect(updateArgs0).toHaveBeenCalled();
    const args = db.budget.update.mock.calls[0][0];
    expect(args.data).not.toHaveProperty('isArchived');
  });

  it('has no categoryId input at all — category reassignment is not a supported command', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget() });
    // @ts-expect-error categoryId is intentionally not part of UpdateBudgetAmountInput
    await svc(db).updateBudgetAmount({ userId: USER, budgetId: 'budget-1', amount: 100, categoryId: 'cat-2' });
    const args = db.budget.update.mock.calls[0][0];
    expect(args.data).not.toHaveProperty('categoryId');
  });
});

describe('budgetService.archiveBudget', () => {
  it('archives an active budget', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget({ isArchived: false }) });
    await svc(db).archiveBudget({ userId: USER, budgetId: 'budget-1' });
    expect(db.budget.update).toHaveBeenCalledWith({ where: { id: 'budget-1' }, data: { isArchived: true } });
  });

  it('rejects archiving an already-archived budget with a stable conflict error', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget({ isArchived: true }) });
    await expect(svc(db).archiveBudget({ userId: USER, budgetId: 'budget-1' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'ALREADY_ARCHIVED',
    });
    expect(db.budget.update).not.toHaveBeenCalled();
  });

  it('treats another user\'s budget as not found', async () => {
    const db = makeDb({ budgetFindFirst: null });
    await expect(svc(db).archiveBudget({ userId: OTHER_USER, budgetId: 'budget-1' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('rejects a nonexistent budget', async () => {
    const db = makeDb({ budgetFindFirst: null });
    await expect(svc(db).archiveBudget({ userId: USER, budgetId: 'ghost' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('budgetService.restoreBudget', () => {
  it('restores an archived budget', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget({ isArchived: true }) });
    await svc(db).restoreBudget({ userId: USER, budgetId: 'budget-1' });
    expect(db.budget.update).toHaveBeenCalledWith({ where: { id: 'budget-1' }, data: { isArchived: false } });
  });

  it('rejects restoring an already-active budget with a stable conflict error', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget({ isArchived: false }) });
    await expect(svc(db).restoreBudget({ userId: USER, budgetId: 'budget-1' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'ALREADY_ACTIVE',
    });
    expect(db.budget.update).not.toHaveBeenCalled();
  });

  it('treats another user\'s budget as not found', async () => {
    const db = makeDb({ budgetFindFirst: null });
    await expect(svc(db).restoreBudget({ userId: OTHER_USER, budgetId: 'budget-1' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('rejects a nonexistent budget', async () => {
    const db = makeDb({ budgetFindFirst: null });
    await expect(svc(db).restoreBudget({ userId: USER, budgetId: 'ghost' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('restores the same row rather than creating a new one (no create call issued)', async () => {
    const db = makeDb({ budgetFindFirst: makeBudget({ isArchived: true }) });
    await svc(db).restoreBudget({ userId: USER, budgetId: 'budget-1' });
    expect(db.budget.create).not.toHaveBeenCalled();
  });
});
