import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const h = vi.hoisted(() => ({
  prisma: { transaction: { findMany: vi.fn(), groupBy: vi.fn() } },
}));
vi.mock('../src/lib/prisma', () => ({ default: h.prisma }));
import { TransactionController } from '../src/controllers/transaction.controller';

function app() {
  const value = express();
  value.use((req, _res, next) => { (req as any).auth = { userId: 'user-1', method: 'jwt' }; next(); });
  value.get('/transactions', TransactionController.getAll);
  value.get('/transactions/summary', TransactionController.summary);
  return value;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.prisma.transaction.findMany.mockResolvedValue([]);
  h.prisma.transaction.groupBy.mockResolvedValue([
    { type: 'INCOME', _sum: { amount: new Prisma.Decimal('10.20') }, _count: { _all: 1 } },
    { type: 'EXPENSE', _sum: { amount: new Prisma.Decimal('0.10') }, _count: { _all: 2 } },
  ]);
});

describe('transaction reporting ranges', () => {
  it('uses a Jakarta half-open month filter for transaction listing', async () => {
    const response = await request(app()).get('/transactions?month=7&year=2026');
    expect(response.status).toBe(200);
    const date = h.prisma.transaction.findMany.mock.calls[0][0].where.date;
    expect(date.gte.toISOString()).toBe('2026-06-30T17:00:00.000Z');
    expect(date.lt.toISOString()).toBe('2026-07-31T17:00:00.000Z');
    expect(date.lte).toBeUndefined();
  });

  it('excludes transfers and calculates net savings with Decimal arithmetic', async () => {
    const response = await request(app()).get('/transactions/summary?month=2026-07');
    expect(response.status).toBe(200);
    expect(h.prisma.transaction.groupBy.mock.calls[0][0].where.type).toEqual({ in: ['INCOME', 'EXPENSE'] });
    expect(response.body.data).toEqual({ income: 10.2, expenses: 0.1, netSavings: 10.1, month: '2026-07' });
  });
});
