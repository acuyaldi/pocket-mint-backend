import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

// One shared transaction-client whose methods we assert against; the mocked
// `$transaction` hands this same object to the controller callback so the
// balance writes issued inside the atomic block are observable.
const h = vi.hoisted(() => {
  const txClient = {
    transaction: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    wallet: { update: vi.fn() },
    installment: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  };
  const prismaMock = {
    transaction: { findFirst: vi.fn(), findMany: vi.fn() },
    wallet: { findFirst: vi.fn(), findMany: vi.fn() },
    category: { findFirst: vi.fn() },
    installment: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { txClient, prismaMock };
});

vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { TransactionController } from '../src/controllers/transaction.controller';

const USER = 'user-1';

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { userId: string }).userId = USER;
    next();
  });
  app.post('/tx', TransactionController.create);
  app.put('/tx/:id', TransactionController.update);
  app.delete('/tx/:id', TransactionController.delete);
  return app;
}

/** All balance writes issued inside the atomic block, as {id, delta:number}. */
function balanceWrites() {
  return h.txClient.wallet.update.mock.calls.map((c) => {
    const arg = c[0] as { where: { id: string }; data: { balance: { increment: Prisma.Decimal } } };
    return { id: arg.where.id, delta: Number(arg.data.balance.increment.toString()) };
  });
}
const netFor = (id: string) => balanceWrites().filter((w) => w.id === id).reduce((a, w) => a + w.delta, 0);
const aggregate = () => balanceWrites().reduce((a, w) => a + w.delta, 0);

beforeEach(() => {
  vi.clearAllMocks();
  h.prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof h.txClient) => unknown) => cb(h.txClient));
  h.txClient.transaction.create.mockResolvedValue({ id: 't1', amount: D(0), type: 'EXPENSE', wallet: {}, category: null });
  h.txClient.transaction.update.mockResolvedValue({ id: 't1', amount: D(0), type: 'EXPENSE', wallet: {}, category: null });
  h.txClient.transaction.delete.mockResolvedValue({ id: 't1' });
  h.txClient.installment.delete.mockResolvedValue({ id: 'i1' });
});

describe('create', () => {
  it('TRANSFER debits source, credits destination, and persists toWalletId', async () => {
    h.prismaMock.wallet.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) =>
      where.id === 'src' ? { id: 'src', type: 'CASH' } : where.id === 'dst' ? { id: 'dst' } : null
    );
    h.txClient.transaction.create.mockResolvedValue({ id: 't1', amount: D(100), type: 'TRANSFER', wallet: {}, category: null });

    const res = await request(buildApp())
      .post('/tx')
      .send({ walletId: 'src', toWalletId: 'dst', type: 'TRANSFER', amount: 100 });

    expect(res.status).toBe(201);
    expect(h.txClient.transaction.create.mock.calls[0][0].data.toWalletId).toBe('dst');
    expect(netFor('src')).toBe(-100);
    expect(netFor('dst')).toBe(100);
    expect(aggregate()).toBe(0); // transfer symmetry
  });

  it('rejects a self-transfer before any mutation', async () => {
    const res = await request(buildApp())
      .post('/tx')
      .send({ walletId: 'src', toWalletId: 'src', type: 'TRANSFER', amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSFER');
    expect(h.txClient.transaction.create).not.toHaveBeenCalled();
    expect(h.txClient.wallet.update).not.toHaveBeenCalled();
  });

  it("rejects a transfer to a wallet the caller doesn't own, with no mutation", async () => {
    h.prismaMock.wallet.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) =>
      where.id === 'src' ? { id: 'src', type: 'CASH' } : null // dst not owned
    );
    const res = await request(buildApp())
      .post('/tx')
      .send({ walletId: 'src', toWalletId: 'dst', type: 'TRANSFER', amount: 100 });

    expect(res.status).toBe(404);
    expect(h.txClient.transaction.create).not.toHaveBeenCalled();
    expect(h.txClient.wallet.update).not.toHaveBeenCalled();
  });
});

describe('update', () => {
  it('reverses the old amount and applies the new one for an EXPENSE', async () => {
    h.prismaMock.transaction.findFirst.mockResolvedValue({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'w1', toWalletId: null, isInstallment: false,
    });
    const res = await request(buildApp()).put('/tx/t1').send({ amount: 150 });

    expect(res.status).toBe(200);
    // +100 (reverse) then -150 (apply) => net -50
    expect(netFor('w1')).toBe(-50);
  });

  it('re-balances BOTH sides when a TRANSFER amount changes', async () => {
    h.prismaMock.transaction.findFirst.mockResolvedValue({
      id: 't1', type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: 'dst', isInstallment: false,
    });
    h.prismaMock.wallet.findFirst.mockResolvedValue({ id: 'dst' });
    const res = await request(buildApp()).put('/tx/t1').send({ amount: 150 });

    expect(res.status).toBe(200);
    expect(netFor('src')).toBe(-50); // +100 -150
    expect(netFor('dst')).toBe(50); //  -100 +150
    expect(aggregate()).toBe(0);
  });

  it('refuses to edit an installment transaction', async () => {
    h.prismaMock.transaction.findFirst.mockResolvedValue({
      id: 't1', type: 'EXPENSE', amount: D(50), walletId: 'w1', toWalletId: null, isInstallment: true,
    });
    const res = await request(buildApp()).put('/tx/t1').send({ amount: 150 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(h.txClient.wallet.update).not.toHaveBeenCalled();
  });

  it('refuses to edit a legacy transfer with no persisted destination', async () => {
    h.prismaMock.transaction.findFirst.mockResolvedValue({
      id: 't1', type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: null, isInstallment: false,
    });
    const res = await request(buildApp()).put('/tx/t1').send({ amount: 150 });

    expect(res.status).toBe(409);
    expect(h.txClient.wallet.update).not.toHaveBeenCalled();
  });
});

describe('delete', () => {
  it('restores the wallet for an EXPENSE', async () => {
    h.prismaMock.transaction.findFirst.mockResolvedValue({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'w1', toWalletId: null, isInstallment: false, installment: null,
    });
    const res = await request(buildApp()).delete('/tx/t1');

    expect(res.status).toBe(200);
    expect(netFor('w1')).toBe(100); // refund
    expect(h.txClient.transaction.delete).toHaveBeenCalled();
  });

  it('restores BOTH wallets for a TRANSFER', async () => {
    h.prismaMock.transaction.findFirst.mockResolvedValue({
      id: 't1', type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: 'dst', isInstallment: false, installment: null,
    });
    const res = await request(buildApp()).delete('/tx/t1');

    expect(res.status).toBe(200);
    expect(netFor('src')).toBe(100); // give back what was debited
    expect(netFor('dst')).toBe(-100); // remove what was credited
    expect(aggregate()).toBe(0);
  });

  it('refunds the FULL grandTotal for an installment and removes the installment row', async () => {
    h.prismaMock.transaction.findFirst.mockResolvedValue({
      id: 't1', type: 'EXPENSE', amount: D(50), walletId: 'w1', toWalletId: null,
      isInstallment: true, installmentId: 'i1', installment: { id: 'i1', grandTotal: D(600) },
    });
    const res = await request(buildApp()).delete('/tx/t1');

    expect(res.status).toBe(200);
    expect(netFor('w1')).toBe(600); // grandTotal, not the 50 monthly amount
    expect(h.txClient.installment.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
  });

  it('refuses to delete a legacy transfer with no persisted destination', async () => {
    h.prismaMock.transaction.findFirst.mockResolvedValue({
      id: 't1', type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: null, isInstallment: false, installment: null,
    });
    const res = await request(buildApp()).delete('/tx/t1');

    expect(res.status).toBe(409);
    expect(h.txClient.wallet.update).not.toHaveBeenCalled();
    expect(h.txClient.transaction.delete).not.toHaveBeenCalled();
  });
});
