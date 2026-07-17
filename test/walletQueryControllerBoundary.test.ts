import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

// Mock the QUERY SERVICE so these tests observe only the controller boundary, and
// mock prisma so we can assert the read handlers never touch the database directly.
const h = vi.hoisted(() => ({
  queryService: { listWallets: vi.fn(), getNetWorth: vi.fn(), getWalletSparkline: vi.fn() },
  prismaMock: {
    wallet: { findMany: vi.fn(), findFirst: vi.fn() },
    transaction: { findMany: vi.fn() },
  },
}));

vi.mock('../src/services/wallet-query.service', () => ({ walletQueryService: h.queryService }));
vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { getAllWallets, getWalletSparkline } from '../src/controllers/account.controller';
import { WalletError } from '../src/services/wallet.errors';
import { errorHandler } from '../src/middlewares/error.middleware';

const USER = 'user-1';

function buildApp(injectUser = true): Express {
  const app = express();
  if (injectUser) {
    app.use((req, _res, next) => {
      // Simulate requireUser publishing the canonical auth context.
      (req as unknown as { auth: { userId: string } }).auth = { userId: USER };
      next();
    });
  }
  app.get('/wallets', getAllWallets);
  app.get('/wallets/:id/sparkline', getWalletSparkline);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

/** Assert no prisma read method was called (the read handlers must delegate). */
function expectPrismaUntouched() {
  expect(h.prismaMock.wallet.findMany).not.toHaveBeenCalled();
  expect(h.prismaMock.wallet.findFirst).not.toHaveBeenCalled();
  expect(h.prismaMock.transaction.findMany).not.toHaveBeenCalled();
}

describe('wallet read controllers — boundary', () => {
  it('getAllWallets: maps userId, calls listWallets once, serializes an asset wallet, 200', async () => {
    h.queryService.listWallets.mockResolvedValue([
      { id: 'w1', type: 'CASH', balance: D('100.25'), creditLimit: D('0'), initialBalance: D('100.25'), interestRate: D('0'), adminFee: D('0') },
    ]);

    const res = await request(buildApp()).get('/wallets');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Fetched wallets');
    expect(h.queryService.listWallets).toHaveBeenCalledTimes(1);
    expect(h.queryService.listWallets).toHaveBeenCalledWith({ userId: USER });

    const w = res.body.data[0];
    expect(w).toMatchObject({ id: 'w1', balance: 100.25, creditLimit: 0, initialBalance: 100.25 });
    expect(w.sisa_limit).toBeNull(); // asset wallet
    expect(w.outstanding_debt).toBeNull();
    expect(w.remainingCredit).toBeNull();
    expect(w.outstanding).toBeNull();
    expectPrismaUntouched();
  });

  it('getAllWallets: computes remaining credit and outstanding for a credit wallet', async () => {
    h.queryService.listWallets.mockResolvedValue([
      { id: 'cc', type: 'CREDIT_CARD', balance: D('-300.50'), creditLimit: D('1000'), initialBalance: D('0'), interestRate: D('2.95'), adminFee: D('0') },
    ]);

    const res = await request(buildApp()).get('/wallets');

    const w = res.body.data[0];
    expect(w.sisa_limit).toBe(699.5); // creditLimit + balance = 1000 + (-300.50)
    expect(w.outstanding_debt).toBe(300.5); // abs(balance)
    expect(w.remainingCredit).toBe(699.5);
    expect(w.outstanding).toBe(300.5);
  });

  it('getAllWallets: reports loan outstanding without a credit remainder', async () => {
    h.queryService.listWallets.mockResolvedValue([
      { id: 'loan', type: 'LOAN', balance: D('-5000'), creditLimit: D('0'), initialBalance: D('-5000'), interestRate: D('0'), adminFee: D('0') },
    ]);

    const res = await request(buildApp()).get('/wallets');
    const w = res.body.data[0];

    expect(w.outstanding).toBe(5000);
    expect(w.remainingCredit).toBeNull();
    expect(w.sisa_limit).toBeNull();
  });

  it('getAllWallets: 401 when no authenticated user, service not called', async () => {
    const res = await request(buildApp(false)).get('/wallets');
    expect(res.status).toBe(401);
    expect(h.queryService.listWallets).not.toHaveBeenCalled();
  });

  it('getWalletSparkline: maps userId + route id, calls once, serializes Decimal→number and preserves null', async () => {
    h.queryService.getWalletSparkline.mockResolvedValue([
      { date: '2026-07-05', balance: null },
      { date: '2026-07-06', balance: D('100.25') },
    ]);

    const res = await request(buildApp()).get('/wallets/wallet-1/sparkline');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Sparkline data');
    expect(h.queryService.getWalletSparkline).toHaveBeenCalledTimes(1);
    expect(h.queryService.getWalletSparkline).toHaveBeenCalledWith({ userId: USER, walletId: 'wallet-1' });
    expect(res.body.data).toEqual([
      { date: '2026-07-05', balance: null },
      { date: '2026-07-06', balance: 100.25 },
    ]);
    expectPrismaUntouched();
  });

  it('forwards a typed WalletError (sparkline 404) with its exact status and code', async () => {
    h.queryService.getWalletSparkline.mockRejectedValue(new WalletError('Wallet not found', 404, 'NOT_FOUND'));

    const res = await request(buildApp()).get('/wallets/nope/sparkline');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Wallet not found');
  });

  it('passes an unexpected error to the central error handler (no manual 500)', async () => {
    h.queryService.listWallets.mockRejectedValue(new Error('db exploded'));

    const res = await request(buildApp()).get('/wallets');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.requestId).toBeTruthy(); // came from errorHandler, not sendError
  });
});
