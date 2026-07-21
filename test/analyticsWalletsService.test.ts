import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createAnalyticsWalletsService } from '../src/services/analytics-wallets.service';
import type { AnalyticsPrismaClient } from '../src/services/analytics-query.types';

const D = (n: number | string) => new Prisma.Decimal(n);
const USER = 'user-1';

function makeDb(over: { findMany?: unknown[]; groupBy?: unknown[] } = {}) {
  return {
    wallet: { findMany: vi.fn(async () => over.findMany ?? []) },
    transaction: { groupBy: vi.fn(async () => over.groupBy ?? []) },
  };
}

const svc = (db: unknown) => createAnalyticsWalletsService(db as AnalyticsPrismaClient);

describe('analyticsWalletsService.getWalletBreakdown', () => {
  it('includes every owned wallet even with zero activity in the period', async () => {
    const db = makeDb({ findMany: [{ id: 'w1', name: 'Cash' }, { id: 'w2', name: 'Bank' }], groupBy: [] });
    const result = await svc(db).getWalletBreakdown({ userId: USER, period: 'current-month' });
    expect(result.wallets).toHaveLength(2);
    expect(result.wallets.every((w) => w.income.toString() === '0' && w.expense.toString() === '0')).toBe(true);
  });

  it('aggregates income and expense per wallet from the grouped sums', async () => {
    const db = makeDb({
      findMany: [{ id: 'w1', name: 'Cash' }],
      groupBy: [
        { walletId: 'w1', type: 'INCOME', _sum: { amount: D('500000') }, _count: { _all: 2 } },
        { walletId: 'w1', type: 'EXPENSE', _sum: { amount: D('200000') }, _count: { _all: 4 } },
      ],
    });
    const result = await svc(db).getWalletBreakdown({ userId: USER, period: 'current-month' });
    const w1 = result.wallets[0];
    expect(w1.income.toString()).toBe('500000');
    expect(w1.expense.toString()).toBe('200000');
    expect(w1.netCashFlow.toString()).toBe('300000');
    expect(w1.transactionCount).toBe(6);
  });

  it('scopes both queries to the caller and excludes TRANSFER from the sums', async () => {
    const db = makeDb();
    await svc(db).getWalletBreakdown({ userId: USER, period: 'current-month' });
    expect(db.wallet.findMany.mock.calls[0][0].where).toEqual({ userId: USER });
    const where = db.transaction.groupBy.mock.calls[0][0].where;
    expect(where.userId).toBe(USER);
    expect(where.type).toEqual({ in: ['INCOME', 'EXPENSE'] });
  });

  it('returns an empty wallets array when the user has no wallets', async () => {
    const db = makeDb({ findMany: [] });
    const result = await svc(db).getWalletBreakdown({ userId: USER, period: 'current-month' });
    expect(result.wallets).toEqual([]);
  });
});
