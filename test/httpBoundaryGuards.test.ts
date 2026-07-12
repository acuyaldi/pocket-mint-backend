import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

// Mock every service the targeted controllers touch, plus prisma, so these tests
// observe only the HTTP boundary (auth guard + query allowlisting).
const h = vi.hoisted(() => ({
  txService: { createTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn() },
  txQuery: { listTransactions: vi.fn(), getSummary: vi.fn() },
  walletService: { createWallet: vi.fn(), updateWallet: vi.fn(), deleteWallet: vi.fn() },
  walletQuery: { listWallets: vi.fn(), getNetWorth: vi.fn(), getWalletSparkline: vi.fn() },
  prismaMock: {
    transaction: { findMany: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn(), count: vi.fn() },
    wallet: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../src/services/transaction.service', () => ({ transactionService: h.txService }));
vi.mock('../src/services/transaction-query.service', () => ({ transactionQueryService: h.txQuery }));
vi.mock('../src/services/wallet.service', () => ({ walletService: h.walletService }));
vi.mock('../src/services/wallet-query.service', () => ({ walletQueryService: h.walletQuery }));
vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { TransactionController } from '../src/controllers/transaction.controller';
import { getAllWallets, createWallet, updateWallet, deleteWallet, getWalletSparkline } from '../src/controllers/account.controller';
import { errorHandler } from '../src/middlewares/error.middleware';

const USER = 'user-1';

/** Mount every targeted route; auth context is injected only when `withAuth`. */
function buildApp(withAuth: boolean): Express {
  const app = express();
  app.use(express.json());
  if (withAuth) {
    app.use((req, _res, next) => {
      (req as unknown as { auth: { userId: string; method: string } }).auth = { userId: USER, method: 'jwt' };
      next();
    });
  }
  app.get('/tx', TransactionController.getAll as RequestHandler);
  app.get('/tx/summary', TransactionController.summary as RequestHandler);
  app.put('/tx/:id', TransactionController.update as RequestHandler);
  app.delete('/tx/:id', TransactionController.delete as RequestHandler);
  app.get('/wallets', getAllWallets as RequestHandler);
  app.post('/wallets', createWallet as RequestHandler);
  app.put('/wallets/:id', updateWallet as RequestHandler);
  app.delete('/wallets/:id', deleteWallet as RequestHandler);
  app.get('/wallets/:id/sparkline', getWalletSparkline as RequestHandler);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.walletQuery.getNetWorth.mockResolvedValue({ totalAset: D('0'), totalUtang: D('0'), netWorth: D('0') });
});

describe('auth guards — no identity, no service call (defense-in-depth)', () => {
  // Every mutating/scoped handler must refuse an unauthenticated request rather
  // than let userId=undefined reach a Prisma-scoped `where` clause.
  const cases: Array<[string, () => request.Test]> = [
    ['GET /tx', () => request(buildApp(false)).get('/tx')],
    ['GET /tx/summary', () => request(buildApp(false)).get('/tx/summary')],
    ['PUT /tx/:id', () => request(buildApp(false)).put('/tx/t1').send({ amount: 1 })],
    ['DELETE /tx/:id', () => request(buildApp(false)).delete('/tx/t1')],
    ['GET /wallets', () => request(buildApp(false)).get('/wallets')],
    ['PUT /wallets/:id', () => request(buildApp(false)).put('/wallets/w1').send({ name: 'x' })],
    ['DELETE /wallets/:id', () => request(buildApp(false)).delete('/wallets/w1')],
    ['GET /wallets/:id/sparkline', () => request(buildApp(false)).get('/wallets/w1/sparkline')],
  ];

  it.each(cases)('%s → 401 and no service invoked', async (_label, run) => {
    const res = await run();
    expect(res.status).toBe(401);
  });

  it('never calls a service or prisma when unauthenticated', async () => {
    await request(buildApp(false)).delete('/tx/t1');
    await request(buildApp(false)).put('/wallets/w1').send({ name: 'x' });
    expect(h.txService.deleteTransaction).not.toHaveBeenCalled();
    expect(h.walletService.updateWallet).not.toHaveBeenCalled();
    expect(h.prismaMock.$transaction).not.toHaveBeenCalled();
    expect(h.prismaMock.wallet.update).not.toHaveBeenCalled();
  });
});

describe('query structural hardening — arrays/objects can never reach the service', () => {
  it('collapses an array-shaped walletId to its first scalar', async () => {
    h.txQuery.listTransactions.mockResolvedValue([]);
    await request(buildApp(true)).get('/tx').query({ walletId: ['a', 'b'] });
    expect(h.txQuery.listTransactions.mock.calls[0][0].walletId).toBe('a');
  });

  it('drops an object-shaped type instead of coercing it to "[object Object]"', async () => {
    h.txQuery.listTransactions.mockResolvedValue([]);
    await request(buildApp(true)).get('/tx').query('type[x]=INCOME');
    expect(h.txQuery.listTransactions.mock.calls[0][0].type).toBeUndefined();
  });

  it('a client cannot supply the all-time flag on the month-scoped list', async () => {
    h.txQuery.listTransactions.mockResolvedValue([]);
    await request(buildApp(true)).get('/tx').query({ allTime: 'true' });
    expect(h.txQuery.listTransactions.mock.calls[0][0].allTime).toBeUndefined();
  });
});

describe('wallet create — allowlist keeps client-only fields out of the service', () => {
  it('ignores body userId and initialBalance; identity is the authenticated caller', async () => {
    h.walletService.createWallet.mockResolvedValue({ id: 'w1', name: 'X', balance: D(1000) });

    await request(buildApp(true))
      .post('/wallets')
      .send({ name: 'X', userId: 'evil', initialBalance: 999999 });

    const arg = h.walletService.createWallet.mock.calls[0][0];
    expect(arg.userId).toBe(USER);
    expect(arg).not.toHaveProperty('initialBalance');
  });
});
