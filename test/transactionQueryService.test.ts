import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

// The service module builds a default instance from the shared Prisma singleton
// at import time. Stub the singleton so importing the module doesn't construct a
// real client — every test here injects its own fake via createTransactionQueryService.
vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createTransactionQueryService } from '../src/services/transaction-query.service';
import { TransactionError } from '../src/services/transaction.errors';
import type { TransactionQueryPrismaClient } from '../src/services/transaction-query.types';

const D = (n: number | string) => new Prisma.Decimal(n);

/** Fake read-only Prisma: findMany/groupBy return injected rows and capture args. */
function makeDb(rows: { findMany?: unknown[]; groupBy?: unknown[] } = {}) {
  return {
    transaction: {
      findMany: vi.fn(async () => rows.findMany ?? []),
      groupBy: vi.fn(async () => rows.groupBy ?? []),
    },
  };
}

const svc = (db: unknown) => createTransactionQueryService(db as TransactionQueryPrismaClient);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const firstArg = (fn: any) => fn.mock.calls[0][0];

const READ_INCLUDE = {
  wallet: { select: { id: true, name: true, type: true } },
  category: { select: { id: true, name: true, type: true } },
};

// Jakarta (reporting tz, UTC+7) half-open bounds for July 2026 — timezone-stable
// regardless of the server's TZ because the reporting zone is fixed, not local.
const JULY_2026 = { gte: '2026-06-30T17:00:00.000Z', lt: '2026-07-31T17:00:00.000Z' };

describe('transactionQueryService.listTransactions', () => {
  afterEach(() => vi.useRealTimers());

  it('scopes to the authenticated user and the current reporting month by default', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00Z'));
    const { transaction } = makeDb();
    await svc({ transaction }).listTransactions({ userId: 'u1' });

    const args = firstArg(transaction.findMany);
    expect(args.where.userId).toBe('u1');
    expect(args.where.date.gte.toISOString()).toBe(JULY_2026.gte);
    expect(args.where.date.lt.toISOString()).toBe(JULY_2026.lt);
    expect(args.where.date.lte).toBeUndefined(); // half-open, never lte
    expect(args.include).toEqual(READ_INCLUDE);
    expect(args.orderBy).toEqual([{ date: 'desc' }, { createdAt: 'desc' }]);
    expect(args.take).toBeUndefined(); // no default cap
  });

  it('applies the wallet and type filters alongside an explicit month/year window', async () => {
    const { transaction } = makeDb();
    await svc({ transaction }).listTransactions({ userId: 'u1', walletId: 'w1', type: 'EXPENSE', month: 7, year: 2026 });

    const where = firstArg(transaction.findMany).where;
    expect(where).toMatchObject({ userId: 'u1', walletId: 'w1', type: 'EXPENSE' });
    expect(where.date.gte.toISOString()).toBe(JULY_2026.gte);
    expect(where.date.lt.toISOString()).toBe(JULY_2026.lt);
  });

  it('combines a wallet filter WITH userId so cross-user data is impossible', async () => {
    const { transaction } = makeDb();
    await svc({ transaction }).listTransactions({ userId: 'owner', walletId: 'someone-elses-wallet', allTime: true });
    const where = firstArg(transaction.findMany).where;
    expect(where.userId).toBe('owner'); // scope is never widened by the filter
    expect(where.walletId).toBe('someone-elses-wallet');
  });

  it('an explicit startDate/endDate range overrides month/year/allTime (DB-level filtering for export)', async () => {
    const { transaction } = makeDb();
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-07-01T00:00:00.000Z');
    await svc({ transaction }).listTransactions({ userId: 'u1', startDate, endDate, month: 1, year: 2020, allTime: true });

    const where = firstArg(transaction.findMany).where;
    expect(where.date.gte).toBe(startDate);
    expect(where.date.lt).toBe(endDate);
  });

  it('skips the date filter entirely for all-time listing', async () => {
    const { transaction } = makeDb();
    await svc({ transaction }).listTransactions({ userId: 'u1', allTime: true, month: 7, year: 2026 });
    expect(firstArg(transaction.findMany).where).not.toHaveProperty('date');
  });

  it('rejects an unsupported type with a typed 400 before any query', async () => {
    const { transaction } = makeDb();
    await expect(
      svc({ transaction }).listTransactions({ userId: 'u1', type: 'NONSENSE' as never })
    ).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(transaction.findMany).not.toHaveBeenCalled();
  });

  it('clamps the limit to 200 and treats 0/absent as no cap', async () => {
    const cases: Array<[number | undefined, number | undefined]> = [
      [500, 200],
      [50, 50],
      [0, undefined],
      [undefined, undefined],
    ];
    for (const [limit, expected] of cases) {
      const { transaction } = makeDb();
      await svc({ transaction }).listTransactions({ userId: 'u1', allTime: true, limit });
      expect(firstArg(transaction.findMany).take).toBe(expected);
    }
  });

  it('returns rows unchanged with Decimals intact (serialization is the controller boundary)', async () => {
    const { transaction } = makeDb({ findMany: [{ id: 't1', amount: D('1.50'), type: 'INCOME' }] });
    const result = await svc({ transaction }).listTransactions({ userId: 'u1', allTime: true });
    expect(result[0].amount).toBeInstanceOf(Prisma.Decimal);
    expect(result[0].amount.toString()).toBe('1.5');
  });

  it('propagates a Prisma failure instead of swallowing it', async () => {
    const transaction = { findMany: vi.fn(async () => { throw new Error('db down'); }), groupBy: vi.fn() };
    await expect(svc({ transaction }).listTransactions({ userId: 'u1', allTime: true })).rejects.toThrow('db down');
  });
});

describe('transactionQueryService.getSummary', () => {
  afterEach(() => vi.useRealTimers());

  it('sums income and expense, excludes transfers, and nets with Decimal arithmetic', async () => {
    const { transaction } = makeDb({
      groupBy: [
        { type: 'INCOME', _sum: { amount: D('10.20') } },
        { type: 'EXPENSE', _sum: { amount: D('0.10') } },
      ],
    });
    const result = await svc({ transaction }).getSummary({ userId: 'u1', month: 7, year: 2026 });

    const args = firstArg(transaction.groupBy);
    expect(args.by).toEqual(['type']);
    expect(args.where.userId).toBe('u1');
    expect(args.where.type).toEqual({ in: ['INCOME', 'EXPENSE'] }); // transfers excluded
    expect(args.where.date.gte.toISOString()).toBe(JULY_2026.gte);
    expect(args.where.date.lt.toISOString()).toBe(JULY_2026.lt);
    expect(args._sum).toEqual({ amount: true }); // persisted monthly amount (installment rule)

    expect(result.income).toBeInstanceOf(Prisma.Decimal);
    expect(result.income.toString()).toBe('10.2');
    expect(result.expenses.toString()).toBe('0.1');
    expect(result.netSavings.toString()).toBe('10.1'); // exact, no float drift
    expect(result.month).toBe('2026-07');
  });

  it('defaults to the current reporting month', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T00:00:00Z'));
    const { transaction } = makeDb();
    const result = await svc({ transaction }).getSummary({ userId: 'u1' });
    expect(result.month).toBe('2026-07');
    expect(firstArg(transaction.groupBy).where.date.gte.toISOString()).toBe(JULY_2026.gte);
  });

  it('returns Decimal zeros for a month with no transactions', async () => {
    const { transaction } = makeDb({ groupBy: [] });
    const result = await svc({ transaction }).getSummary({ userId: 'u1', month: 7, year: 2026 });
    expect(result.income.toString()).toBe('0');
    expect(result.expenses.toString()).toBe('0');
    expect(result.netSavings.toString()).toBe('0');
    expect(result.netSavings).toBeInstanceOf(Prisma.Decimal);
  });

  it('clamps an out-of-range month via the reporting normalization', async () => {
    const { transaction } = makeDb();
    const result = await svc({ transaction }).getSummary({ userId: 'u1', month: 13, year: 2026 });
    expect(result.month).toBe('2026-12'); // 13 → clamped to December
  });

  it('propagates a Prisma failure', async () => {
    const transaction = { findMany: vi.fn(), groupBy: vi.fn(async () => { throw new Error('boom'); }) };
    await expect(svc({ transaction }).getSummary({ userId: 'u1', month: 7, year: 2026 })).rejects.toThrow('boom');
  });
});
