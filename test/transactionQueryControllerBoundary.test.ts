import { beforeEach, describe, expect, it, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

// Mock the QUERY SERVICE so these tests observe only the controller boundary, and
// mock prisma so we can assert the read handlers never touch the database directly.
const h = vi.hoisted(() => ({
  queryService: { listTransactions: vi.fn(), getSummary: vi.fn() },
  prismaMock: {
    transaction: { findMany: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() },
    wallet: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../src/services/transaction-query.service', () => ({ transactionQueryService: h.queryService }));
vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { TransactionController } from '../src/controllers/transaction.controller';
import { TransactionError } from '../src/services/transaction.errors';
import { errorHandler } from '../src/middlewares/error.middleware';

const USER = 'user-1';

function buildApp(): Express {
  const app = express();
  app.use((req, _res, next) => {
    // Simulate requireUser publishing the canonical auth context.
    (req as unknown as { auth: { userId: string; method: string } }).auth = { userId: USER, method: 'jwt' };
    next();
  });
  app.get('/tx', TransactionController.getAll);
  app.get('/tx/all', TransactionController.getAllTime);
  app.get('/tx/summary', TransactionController.summary);
  app.get('/tx/export', TransactionController.export);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

/** Assert no prisma read method was called (the read handlers must delegate). */
function expectPrismaUntouched() {
  expect(h.prismaMock.transaction.findMany).not.toHaveBeenCalled();
  expect(h.prismaMock.transaction.groupBy).not.toHaveBeenCalled();
  expect(h.prismaMock.transaction.findFirst).not.toHaveBeenCalled();
}

describe('transaction read controllers — boundary', () => {
  it('getAll: maps userId + allowlisted filters, calls the service once, serializes 200', async () => {
    h.queryService.listTransactions.mockResolvedValue([
      { id: 't1', amount: D(100), type: 'INCOME', wallet: {}, category: null },
    ]);

    const res = await request(buildApp())
      .get('/tx')
      .query({ walletId: 'w1', type: 'INCOME', month: '7', year: '2026', limit: '5', foo: 'bar', userId: 'evil' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Retrieved transactions (current month)');
    expect(res.body.data[0]).toMatchObject({ id: 't1', amount: 100 }); // Decimal → number
    expect(h.queryService.listTransactions).toHaveBeenCalledTimes(1);

    const arg = h.queryService.listTransactions.mock.calls[0][0];
    expect(arg.userId).toBe(USER); // authenticated id wins over ?userId=evil
    expect(arg).toMatchObject({ walletId: 'w1', type: 'INCOME', month: 7, year: 2026, limit: 5 });
    expect(arg).not.toHaveProperty('foo'); // not on the allowlist
    expect(arg.allTime).toBeUndefined();
    expectPrismaUntouched();
  });

  it('getAllTime: delegates with allTime:true and the all-time message', async () => {
    h.queryService.listTransactions.mockResolvedValue([]);

    const res = await request(buildApp()).get('/tx/all').query({ type: 'EXPENSE' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Retrieved all transactions');
    expect(h.queryService.listTransactions).toHaveBeenCalledTimes(1);
    expect(h.queryService.listTransactions.mock.calls[0][0]).toMatchObject({
      userId: USER,
      allTime: true,
      type: 'EXPENSE',
    });
    expectPrismaUntouched();
  });

  it('summary: parses YYYY-MM, calls getSummary, serializes Decimals to numbers', async () => {
    h.queryService.getSummary.mockResolvedValue({
      income: D('10.20'),
      expenses: D('0.10'),
      netSavings: D('10.10'),
      month: '2026-07',
    });

    const res = await request(buildApp()).get('/tx/summary').query({ month: '2026-07' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Monthly summary');
    expect(res.body.data).toEqual({ income: 10.2, expenses: 0.1, netSavings: 10.1, month: '2026-07' });
    expect(h.queryService.getSummary).toHaveBeenCalledWith({ userId: USER, year: 2026, month: 7 });
    expectPrismaUntouched();
  });

  it('summary: a missing/invalid month param falls through to the service default', async () => {
    h.queryService.getSummary.mockResolvedValue({ income: D(0), expenses: D(0), netSavings: D(0), month: '2026-07' });

    await request(buildApp()).get('/tx/summary');

    expect(h.queryService.getSummary).toHaveBeenCalledWith({ userId: USER });
  });

  it('export: resolves a DB-level date range for the period, streams CSV, never fetches all-time', async () => {
    h.queryService.listTransactions.mockResolvedValue([
      {
        id: 't1',
        date: new Date('2026-07-05T00:00:00.000Z'),
        type: 'EXPENSE',
        description: 'Coffee, "iced"',
        amount: D('25000'),
        wallet: { name: 'BCA' },
        category: { name: 'Food' },
      },
    ]);

    const res = await request(buildApp())
      .get('/tx/export')
      .query({ period: 'month', anchor: '2026-07' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('financial-report-2026-07-01_to_2026-07-31.csv');
    expect(res.text).toContain('"Coffee, ""iced"""');
    expect(res.text).toContain('BCA');

    const arg = h.queryService.listTransactions.mock.calls[0][0];
    expect(arg.userId).toBe(USER);
    expect(arg.startDate).toBeInstanceOf(Date);
    expect(arg.endDate).toBeInstanceOf(Date);
    expect(arg.allTime).toBeUndefined();
    expectPrismaUntouched();
  });

  it('export: rejects a full YYYY-MM-DD anchor — only YYYY-MM is accepted', async () => {
    const res = await request(buildApp())
      .get('/tx/export')
      .query({ period: 'month', anchor: '2026-07-15' });

    expect(res.status).toBe(400);
    expect(h.queryService.listTransactions).not.toHaveBeenCalled();
  });

  it('export: rejects an unsupported period before querying', async () => {
    const res = await request(buildApp()).get('/tx/export').query({ period: 'year' });
    expect(res.status).toBe(400);
    expect(h.queryService.listTransactions).not.toHaveBeenCalled();
  });

  it('export: prefixes leading =, +, -, @ in text fields with an apostrophe to prevent formula injection', async () => {
    h.queryService.listTransactions.mockResolvedValue([
      {
        id: 't1', date: new Date('2026-07-05T00:00:00.000Z'), type: 'EXPENSE',
        description: '=SUM(A1:A9)', amount: D('1000'),
        wallet: { name: '+CMD|/c calc' }, category: { name: '-1+1' },
      },
      {
        id: 't2', date: new Date('2026-07-06T00:00:00.000Z'), type: 'INCOME',
        description: '@import', amount: D('-500'),
        wallet: { name: 'BCA' }, category: { name: 'Food' },
      },
    ]);

    const res = await request(buildApp())
      .get('/tx/export')
      .query({ period: 'month', anchor: '2026-07' });

    expect(res.text).toContain("'=SUM(A1:A9)");
    expect(res.text).toContain("'+CMD|/c calc");
    expect(res.text).toContain("'-1+1");
    expect(res.text).toContain("'@import");
    // Amount stays untouched/numeric even for a negative value.
    expect(res.text).toContain(',1000');
    expect(res.text).toContain(',-500');
    expect(res.text).not.toContain(",'1000");
    expect(res.text).not.toContain(",'-500");
  });

  it('export: header uses Date, Description, Wallet, Category, Type, Amount order and a UTF-8 BOM', async () => {
    h.queryService.listTransactions.mockResolvedValue([]);

    const res = await request(buildApp())
      .get('/tx/export')
      .query({ period: 'month', anchor: '2026-07' });

    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    expect(res.text).toContain('Date,Description,Wallet,Category,Type,Amount');
  });

  it('forwards a typed TransactionError with its exact status and code', async () => {
    h.queryService.listTransactions.mockRejectedValue(
      new TransactionError('Invalid type. Allowed: INCOME, EXPENSE, TRANSFER', 400, 'BAD_REQUEST')
    );

    const res = await request(buildApp()).get('/tx').query({ type: 'BOGUS' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('passes an unexpected error to the central error handler (no manual 500)', async () => {
    h.queryService.getSummary.mockRejectedValue(new Error('db exploded'));

    const res = await request(buildApp()).get('/tx/summary');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.requestId).toBeTruthy(); // came from errorHandler, not sendError
  });
});
