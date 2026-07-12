import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

// Mock the SERVICE so these tests observe only the controller boundary, and mock
// prisma so we can assert the mutation handlers never touch the database directly.
const h = vi.hoisted(() => ({
  service: { createTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn() },
  prismaMock: {
    transaction: { findMany: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() },
    wallet: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../src/services/transaction.service', () => ({ transactionService: h.service }));
vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { TransactionController } from '../src/controllers/transaction.controller';
import { TransactionError } from '../src/services/transaction.errors';
import { errorHandler } from '../src/middlewares/error.middleware';

const USER = 'user-1';

function buildApp(injectUser = true): Express {
  const app = express();
  app.use(express.json());
  if (injectUser) {
    app.use((req, _res, next) => {
      // Simulate requireUser publishing the canonical auth context.
      (req as unknown as { auth: { userId: string; method: string } }).auth = { userId: USER, method: 'jwt' };
      next();
    });
  }
  app.post('/tx', TransactionController.create);
  app.put('/tx/:id', TransactionController.update);
  app.delete('/tx/:id', TransactionController.delete);
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

/** Assert no prisma model method was called (the mutation handlers must delegate). */
function expectPrismaUntouched() {
  expect(h.prismaMock.$transaction).not.toHaveBeenCalled();
  expect(h.prismaMock.transaction.findFirst).not.toHaveBeenCalled();
  expect(h.prismaMock.wallet.findFirst).not.toHaveBeenCalled();
  expect(h.prismaMock.wallet.update).not.toHaveBeenCalled();
}

describe('transaction mutation controllers — boundary', () => {
  it('create: maps userId + only allowlisted fields, calls the service once, serializes 201', async () => {
    h.service.createTransaction.mockResolvedValue({ id: 't1', amount: D(100), type: 'INCOME', toWalletId: null });

    const res = await request(buildApp())
      .post('/tx')
      .send({ type: 'INCOME', amount: 100, walletId: 'w1', foo: 'bar', userId: 'evil' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: 't1', amount: 100 }); // Decimal serialized to number
    expect(h.service.createTransaction).toHaveBeenCalledTimes(1);

    const arg = h.service.createTransaction.mock.calls[0][0];
    expect(arg.userId).toBe(USER); // authenticated id wins
    expect(arg).toMatchObject({ type: 'INCOME', amount: 100, walletId: 'w1' });
    expect(arg).not.toHaveProperty('foo'); // not on the allowlist
    expectPrismaUntouched();
  });

  it('update: maps id + userId and calls updateTransaction once, 200', async () => {
    h.service.updateTransaction.mockResolvedValue({ id: 't9', amount: D(50), type: 'EXPENSE' });

    const res = await request(buildApp()).put('/tx/t9').send({ amount: 50 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 't9', amount: 50 });
    expect(h.service.updateTransaction).toHaveBeenCalledTimes(1);
    expect(h.service.updateTransaction.mock.calls[0][0]).toMatchObject({ userId: USER, id: 't9', amount: 50 });
    expectPrismaUntouched();
  });

  it('delete: calls deleteTransaction with { userId, id } and echoes the result, 200', async () => {
    h.service.deleteTransaction.mockResolvedValue({ id: 't5' });

    const res = await request(buildApp()).delete('/tx/t5');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 't5' });
    expect(res.body.message).toContain('t5');
    expect(h.service.deleteTransaction).toHaveBeenCalledWith({ userId: USER, id: 't5' });
    expectPrismaUntouched();
  });

  it('forwards a typed TransactionError with its exact status and code', async () => {
    h.service.updateTransaction.mockRejectedValue(
      new TransactionError('Transaction with id t1 not found', 404, 'TRANSACTION_NOT_FOUND')
    );

    const res = await request(buildApp()).put('/tx/t1').send({ amount: 10 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TRANSACTION_NOT_FOUND');
    expect(res.body.success).toBe(false);
  });

  it('passes an unexpected error to the central error handler (no manual 500)', async () => {
    h.service.createTransaction.mockRejectedValue(new Error('db exploded'));

    const res = await request(buildApp()).post('/tx').send({ type: 'INCOME', amount: 1, walletId: 'w1' });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.requestId).toBeTruthy(); // came from errorHandler, not sendError
  });

  it('rejects create with 400 when no authenticated user can be resolved', async () => {
    const res = await request(buildApp(false)).post('/tx').send({ type: 'INCOME', amount: 1, walletId: 'w1' });

    expect(res.status).toBe(400);
    expect(h.service.createTransaction).not.toHaveBeenCalled();
  });
});
