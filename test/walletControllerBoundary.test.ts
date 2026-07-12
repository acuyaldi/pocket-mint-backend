import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

// Mock the SERVICE so these tests observe only the controller boundary, and mock
// prisma so we can assert the mutation handlers never touch the database directly.
// (prisma.wallet.findMany is still used by the reporting net-worth snapshot.)
const h = vi.hoisted(() => ({
  service: { createWallet: vi.fn(), updateWallet: vi.fn(), deleteWallet: vi.fn() },
  prismaMock: {
    wallet: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    transaction: { count: vi.fn() },
  },
}));

vi.mock('../src/services/wallet.service', () => ({ walletService: h.service }));
vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { createWallet, updateWallet, deleteWallet } from '../src/controllers/account.controller';
import { WalletError } from '../src/services/wallet.errors';
import { errorHandler } from '../src/middlewares/error.middleware';

const USER = 'user-1';

function buildApp(injectUser = true): Express {
  const app = express();
  app.use(express.json());
  if (injectUser) {
    app.use((req, _res, next) => {
      (req as unknown as { userId: string }).userId = USER;
      next();
    });
  }
  app.post('/wallets', createWallet);
  app.put('/wallets/:id', updateWallet);
  app.delete('/wallets/:id', deleteWallet);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.prismaMock.wallet.findMany.mockResolvedValue([]); // net-worth snapshot
});

/** Assert no wallet-mutation prisma method was called (handlers must delegate). */
function expectPrismaMutationsUntouched() {
  expect(h.prismaMock.wallet.create).not.toHaveBeenCalled();
  expect(h.prismaMock.wallet.update).not.toHaveBeenCalled();
  expect(h.prismaMock.wallet.delete).not.toHaveBeenCalled();
  expect(h.prismaMock.wallet.findFirst).not.toHaveBeenCalled();
  expect(h.prismaMock.transaction.count).not.toHaveBeenCalled();
}

describe('wallet mutation controllers — boundary', () => {
  it('create: maps authenticated userId (ignoring body userId), allowlists fields, 201', async () => {
    h.service.createWallet.mockResolvedValue({ id: 'w1', name: 'X', balance: D(1000) });

    const res = await request(buildApp())
      .post('/wallets')
      .send({ name: 'X', type: 'CASH', foo: 'bar', userId: 'evil' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Wallet created successfully');
    expect(res.body.data).toMatchObject({ id: 'w1', name: 'X' });
    expect(res.body.data.netWorth).toBeDefined();
    expect(h.service.createWallet).toHaveBeenCalledTimes(1);

    const arg = h.service.createWallet.mock.calls[0][0];
    expect(arg.userId).toBe(USER); // authenticated id wins over body 'evil'
    expect(arg).toMatchObject({ name: 'X', type: 'CASH' });
    expect(arg).not.toHaveProperty('foo'); // not on the allowlist
    expectPrismaMutationsUntouched();
  });

  it('create: 400 when no authenticated user can be resolved, service not called', async () => {
    const res = await request(buildApp(false)).post('/wallets').send({ name: 'X' });

    expect(res.status).toBe(400);
    expect(h.service.createWallet).not.toHaveBeenCalled();
  });

  it('update: maps route id + userId and allowlisted fields, calls once, 200', async () => {
    h.service.updateWallet.mockResolvedValue({ id: 'w9', userId: USER, name: 'New' });

    const res = await request(buildApp()).put('/wallets/w9').send({ name: 'New', foo: 'x', userId: 'evil' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Wallet updated successfully');
    expect(h.service.updateWallet).toHaveBeenCalledTimes(1);

    const arg = h.service.updateWallet.mock.calls[0][0];
    expect(arg).toMatchObject({ userId: USER, walletId: 'w9', name: 'New' });
    expect(arg).not.toHaveProperty('foo');
    expectPrismaMutationsUntouched();
  });

  it('delete: normalizes ?force=true and echoes the result id, 200', async () => {
    h.service.deleteWallet.mockResolvedValue({ id: 'w5' });

    const res = await request(buildApp()).delete('/wallets/w5?force=true');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 'w5' });
    expect(res.body.message).toContain('w5');
    expect(h.service.deleteWallet).toHaveBeenCalledWith({ userId: USER, walletId: 'w5', force: true });
    expectPrismaMutationsUntouched();
  });

  it('delete: force defaults to false when the query param is absent', async () => {
    h.service.deleteWallet.mockResolvedValue({ id: 'w5' });

    await request(buildApp()).delete('/wallets/w5');

    expect(h.service.deleteWallet).toHaveBeenCalledWith({ userId: USER, walletId: 'w5', force: false });
  });

  it('forwards a typed WalletError with its exact status and code', async () => {
    h.service.updateWallet.mockRejectedValue(new WalletError('Wallet with id w1 not found', 404, 'NOT_FOUND'));

    const res = await request(buildApp()).put('/wallets/w1').send({ name: 'X' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.success).toBe(false);
  });

  it('passes an unexpected error to the central error handler (no manual 500)', async () => {
    h.service.createWallet.mockRejectedValue(new Error('db exploded'));

    const res = await request(buildApp()).post('/wallets').send({ name: 'X' });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.requestId).toBeTruthy(); // came from errorHandler, not sendError
  });
});
