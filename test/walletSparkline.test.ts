import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const h = vi.hoisted(() => ({
  prisma: {
    wallet: { findFirst: vi.fn(), findMany: vi.fn() },
    transaction: { findMany: vi.fn() },
  },
}));
vi.mock('../src/lib/prisma', () => ({ default: h.prisma }));

import { getWalletSparkline } from '../src/controllers/account.controller';

function app() {
  const value = express();
  value.use((req, _res, next) => { (req as any).auth = { userId: 'user-1', method: 'jwt' }; next(); });
  value.get('/wallets/:id/sparkline', getWalletSparkline);
  return value;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-11T10:00:00.000Z'));
  h.prisma.wallet.findFirst.mockResolvedValue({
    id: 'wallet-1', balance: new Prisma.Decimal('100.25'), createdAt: new Date('2026-01-01T00:00:00Z'),
  });
  h.prisma.transaction.findMany.mockResolvedValue([]);
});

describe('wallet sparkline', () => {
  it('returns exactly seven reporting-day closing balances oldest first', async () => {
    const response = await request(app()).get('/wallets/wallet-1/sparkline');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(7);
    expect(response.body.data.map((point: { date: string }) => point.date)).toEqual([
      '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08',
      '2026-07-09', '2026-07-10', '2026-07-11',
    ]);
    expect(response.body.data.every((point: { balance: number }) => point.balance === 100.25)).toBe(true);
  });

  it('queries every source or destination transaction with half-open boundaries', async () => {
    await request(app()).get('/wallets/wallet-1/sparkline');
    const query = h.prisma.transaction.findMany.mock.calls[0][0];
    expect(query.where.OR).toEqual([{ walletId: 'wallet-1' }, { toWalletId: 'wallet-1' }]);
    expect(query.where.date.gte.toISOString()).toBe('2026-07-04T17:00:00.000Z');
    expect(query.where.date.lt.toISOString()).toBe('2026-07-11T17:00:00.000Z');
    expect(query.where.date.lte).toBeUndefined();
  });

  it('reverses a future-dated effect embedded in the stored current balance', async () => {
    h.prisma.transaction.findMany.mockResolvedValue([
      { id: 'future', type: 'EXPENSE', amount: new Prisma.Decimal('25'), walletId: 'wallet-1', toWalletId: null, isInstallment: false, installment: null, date: new Date('2026-07-11T12:00:00Z'), createdAt: new Date('2026-07-11T09:00:00Z') },
    ]);
    const response = await request(app()).get('/wallets/wallet-1/sparkline');
    expect(response.body.data[6].balance).toBe(125.25);
  });

  it('reconstructs income, expense, installment, and transfer effects by wallet perspective', async () => {
    h.prisma.transaction.findMany.mockResolvedValue([
      { id: '4', type: 'TRANSFER', amount: new Prisma.Decimal('5.05'), walletId: 'other', toWalletId: 'wallet-1', isInstallment: false, installment: null, date: new Date('2026-07-10T12:00:00Z'), createdAt: new Date('2026-07-10T12:00:00Z') },
      { id: '3', type: 'TRANSFER', amount: new Prisma.Decimal('10.10'), walletId: 'wallet-1', toWalletId: 'other', isInstallment: false, installment: null, date: new Date('2026-07-09T12:00:00Z'), createdAt: new Date('2026-07-09T12:00:00Z') },
      { id: '2', type: 'EXPENSE', amount: new Prisma.Decimal('2'), walletId: 'wallet-1', toWalletId: null, isInstallment: true, installment: { grandTotal: new Prisma.Decimal('20.20') }, date: new Date('2026-07-08T12:00:00Z'), createdAt: new Date('2026-07-08T12:00:00Z') },
      { id: '1', type: 'INCOME', amount: new Prisma.Decimal('1.01'), walletId: 'wallet-1', toWalletId: null, isInstallment: false, installment: null, date: new Date('2026-07-07T12:00:00Z'), createdAt: new Date('2026-07-07T12:00:00Z') },
    ]);
    const response = await request(app()).get('/wallets/wallet-1/sparkline');
    expect(response.body.data.map((p: { balance: number }) => p.balance)).toEqual([
      124.49, 124.49, 125.5, 105.3, 95.2, 100.25, 100.25,
    ]);
  });

  it('uses null rather than fabricating balances before wallet creation', async () => {
    h.prisma.wallet.findFirst.mockResolvedValue({
      id: 'wallet-1', balance: new Prisma.Decimal('10'), createdAt: new Date('2026-07-09T01:00:00Z'),
    });
    const response = await request(app()).get('/wallets/wallet-1/sparkline');
    expect(response.body.data.slice(0, 4).every((p: { balance: null }) => p.balance === null)).toBe(true);
    expect(response.body.data[4].balance).toBe(10);
  });
});
