import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

// The service module builds a default instance from the shared Prisma singleton
// at import time. Stub that singleton so importing the module doesn't construct a
// real client — every test here injects its own fake via createTransactionService.
vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createTransactionService } from '../src/services/transaction.service';
import { TransactionError } from '../src/services/transaction.errors';
import type { TransactionPrismaClient } from '../src/services/transaction.types';

const D = (n: number | string) => new Prisma.Decimal(n);

interface FakeOptions {
  failInstallmentUpdate?: boolean;
}

/**
 * Behavior-focused fake Prisma. `$transaction` buffers wallet writes and only
 * commits them if the callback resolves — so a mid-transaction failure leaves
 * `committed` empty, proving atomic rollback. Balance writes are recorded as
 * signed deltas regardless of increment/decrement.
 */
function makeDb(opts: FakeOptions = {}) {
  const committed: { id: string; delta: number }[] = [];
  const installmentCreates: Record<string, any>[] = [];
  const transactionCreates: Record<string, any>[] = [];

  const makeTx = (buffer: { id: string; delta: number }[]) => ({
    transaction: {
      create: vi.fn(async ({ data }: any) => {
        transactionCreates.push(data);
        return { id: 'tx-new', ...data };
      }),
      update: vi.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      delete: vi.fn(async () => ({ id: 'deleted' })),
    },
    wallet: {
      update: vi.fn(async ({ where, data }: any) => {
        const inc = data.balance.increment;
        const dec = data.balance.decrement;
        const delta = inc !== undefined ? Number(inc.toString()) : -Number(dec.toString());
        buffer.push({ id: where.id, delta });
      }),
    },
    installment: {
      create: vi.fn(async ({ data }: any) => {
        installmentCreates.push(data);
        return { id: 'inst-new', ...data };
      }),
      update: vi.fn(async () => {
        if (opts.failInstallmentUpdate) throw new Error('boom');
        return {};
      }),
      delete: vi.fn(async () => ({})),
    },
  });

  const db = {
    wallet: { findFirst: vi.fn() },
    category: {
      findFirst: vi.fn(async ({ where }: any) => ({
        id: where.id,
        userId: where.userId,
        type: String(where.id).includes('income') ? 'INCOME' : 'EXPENSE',
      })),
    },
    transaction: { findFirst: vi.fn() },
    installment: {},
    $transaction: vi.fn(async (cb: (tx: any) => Promise<unknown>) => {
      const buffer: { id: string; delta: number }[] = [];
      const result = await cb(makeTx(buffer));
      committed.push(...buffer);
      return result;
    }),
  };

  const net = (id: string) => committed.filter((c) => c.id === id).reduce((a, c) => a + c.delta, 0);
  const aggregate = () => committed.reduce((a, c) => a + c.delta, 0);
  return { db, net, aggregate, committed, installmentCreates, transactionCreates };
}

/** wallet.findFirst that returns a wallet only for the listed ids. */
const ownedWallets = (map: Record<string, Record<string, unknown>>) =>
  vi.fn(async ({ where }: any) => (map[where.id] ? { id: where.id, ...map[where.id] } : null));

const svc = (db: unknown) => {
  const service = createTransactionService(db as TransactionPrismaClient);
  return {
    ...service,
    createTransaction: (input: Parameters<typeof service.createTransaction>[0]) =>
      service.createTransaction({
        ...input,
        ...(input.type !== 'TRANSFER' && !input.categoryId
          ? { categoryId: input.type === 'INCOME' ? 'cat-income' : 'cat-expense' }
          : {}),
      }),
  };
};

describe('transactionService.createTransaction', () => {
  it('requires a category for income and expense', async () => {
    const { db, committed } = makeDb();
    db.wallet.findFirst = ownedWallets({ cash: { type: 'CASH', balance: D(1000) } });

    await expect(createTransactionService(db as TransactionPrismaClient).createTransaction({
      userId: 'u', type: 'EXPENSE', amount: 100, walletId: 'cash',
    })).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(committed).toHaveLength(0);
  });

  it('requires the category type to match the transaction type', async () => {
    const { db, committed } = makeDb();
    db.wallet.findFirst = ownedWallets({ cash: { type: 'CASH', balance: D(1000) } });
    db.category.findFirst = vi.fn(async () => ({ id: 'income-cat', userId: 'u', type: 'INCOME' }));

    await expect(createTransactionService(db as TransactionPrismaClient).createTransaction({
      userId: 'u', type: 'EXPENSE', amount: 100, walletId: 'cash', categoryId: 'income-cat',
    })).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(committed).toHaveLength(0);
  });

  it('rejects a category on transfers', async () => {
    const { db, committed } = makeDb();
    db.wallet.findFirst = ownedWallets({
      src: { type: 'BANK', balance: D(1000) }, dst: { type: 'LOAN', balance: D(-500) },
    });

    await expect(createTransactionService(db as TransactionPrismaClient).createTransaction({
      userId: 'u', type: 'TRANSFER', amount: 100, walletId: 'src', toWalletId: 'dst', categoryId: 'cat-expense',
    })).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(committed).toHaveLength(0);
  });

  it('creates an INCOME and credits the wallet', async () => {
    const { db, net } = makeDb();
    db.wallet.findFirst = ownedWallets({ w1: { type: 'CASH' } });
    const created = await svc(db).createTransaction({ userId: 'u', type: 'INCOME', amount: 100, walletId: 'w1' });
    expect(created.type).toBe('INCOME');
    expect(net('w1')).toBe(100);
  });

  it('creates an EXPENSE and debits the wallet', async () => {
    const { db, net } = makeDb();
    db.wallet.findFirst = ownedWallets({ w1: { type: 'CASH' } });
    await svc(db).createTransaction({ userId: 'u', type: 'EXPENSE', amount: 100, walletId: 'w1' });
    expect(net('w1')).toBe(-100);
  });

  it('creates a TRANSFER symmetrically and persists toWalletId', async () => {
    const { db, net, aggregate } = makeDb();
    db.wallet.findFirst = ownedWallets({ src: { type: 'CASH', balance: D(500) }, dst: {} });
    const created = await svc(db).createTransaction({ userId: 'u', type: 'TRANSFER', amount: 100, walletId: 'src', toWalletId: 'dst' });
    expect((created as any).toWalletId).toBe('dst');
    expect(net('src')).toBe(-100);
    expect(net('dst')).toBe(100);
    expect(aggregate()).toBe(0);
  });

  it('allows an e-wallet source and a credit-card destination', async () => {
    const { db, net } = makeDb();
    db.wallet.findFirst = ownedWallets({
      src: { type: 'E_WALLET', balance: D(500) },
      card: { type: 'CREDIT_CARD', balance: D(-300) },
    });

    await svc(db).createTransaction({
      userId: 'u', type: 'TRANSFER', amount: 200, walletId: 'src', toWalletId: 'card',
    });

    expect(net('src')).toBe(-200);
    expect(net('card')).toBe(200);
  });

  it('rejects a liability as a transfer source', async () => {
    const { db, committed } = makeDb();
    db.wallet.findFirst = ownedWallets({
      card: { type: 'CREDIT_CARD', balance: D(-300) },
      bank: { type: 'BANK', balance: D(1000) },
    });

    await expect(svc(db).createTransaction({
      userId: 'u', type: 'TRANSFER', amount: 100, walletId: 'card', toWalletId: 'bank',
    })).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_TRANSFER' });
    expect(committed).toHaveLength(0);
  });

  it('rejects a transfer when the source balance is insufficient', async () => {
    const { db, committed } = makeDb();
    db.wallet.findFirst = ownedWallets({
      bank: { type: 'BANK', balance: D(50) },
      loan: { type: 'LOAN', balance: D(-1000) },
    });

    await expect(svc(db).createTransaction({
      userId: 'u', type: 'TRANSFER', amount: 100, walletId: 'bank', toWalletId: 'loan',
    })).rejects.toMatchObject({ statusCode: 400, code: 'INSUFFICIENT_FUNDS' });
    expect(committed).toHaveLength(0);
  });

  it('creates an installment and locks the full grandTotal on the wallet', async () => {
    const { db, net } = makeDb();
    db.wallet.findFirst = ownedWallets({ cc: { type: 'CREDIT_CARD', balance: D(0), creditLimit: D(1000), cutoffDay: 20, paymentDueDay: 5 } });
    await svc(db).createTransaction({
      userId: 'u', type: 'EXPENSE', amount: 300, walletId: 'cc',
      isInstallment: true, installmentMonths: 3, interestRate: 0,
    });
    expect(net('cc')).toBe(-300); // grandTotal, not the monthly 100
  });

  it('creates a one-term FULL bill for a normal credit expense', async () => {
    const { db, net, installmentCreates, transactionCreates } = makeDb();
    db.wallet.findFirst = ownedWallets({
      cc: { type: 'CREDIT_CARD', balance: D(-200), creditLimit: D(1000), cutoffDay: 20, paymentDueDay: 5 },
    });

    await svc(db).createTransaction({
      userId: 'u',
      type: 'EXPENSE',
      amount: 250,
      walletId: 'cc',
      date: '2026-07-10',
      billingMode: 'FULL',
    });

    expect(net('cc')).toBe(-250);
    expect(installmentCreates[0]).toMatchObject({
      kind: 'FULL',
      installmentMonths: 1,
      paidTerms: 0,
      monthlyAmount: D(250),
    });
    expect(installmentCreates[0].nextDueDate.toISOString()).toBe('2026-08-04T17:00:00.000Z');
    expect(transactionCreates[0]).toMatchObject({ isInstallment: true, installmentId: 'inst-new' });
  });

  it('allows a two-term installment below Rp500.000', async () => {
    const { db, installmentCreates } = makeDb();
    db.wallet.findFirst = ownedWallets({
      pay: { type: 'PAYLATER', balance: D(0), creditLimit: D(500_000), cutoffDay: 15, paymentDueDay: 28 },
    });

    await svc(db).createTransaction({
      userId: 'u',
      type: 'EXPENSE',
      amount: 200_000,
      walletId: 'pay',
      date: '2026-07-10',
      billingMode: 'INSTALLMENT',
      installmentMonths: 2,
      interestRate: 0,
    });

    expect(installmentCreates[0]).toMatchObject({ kind: 'INSTALLMENT', installmentMonths: 2, paidTerms: 0 });
  });

  it('rejects a credit purchase above remaining credit', async () => {
    const { db, committed, installmentCreates } = makeDb();
    db.wallet.findFirst = ownedWallets({
      cc: { type: 'CREDIT_CARD', balance: D(-800), creditLimit: D(1000), cutoffDay: 20, paymentDueDay: 5 },
    });

    await expect(svc(db).createTransaction({
      userId: 'u', type: 'EXPENSE', amount: 201, walletId: 'cc', billingMode: 'FULL',
    })).rejects.toMatchObject({ statusCode: 400, code: 'INSUFFICIENT_CREDIT' });
    expect(committed).toHaveLength(0);
    expect(installmentCreates).toHaveLength(0);
  });

  it('rejects using a loan as an expense source', async () => {
    const { db, committed } = makeDb();
    db.wallet.findFirst = ownedWallets({ loan: { type: 'LOAN', balance: D(-1000), creditLimit: D(0) } });

    await expect(svc(db).createTransaction({
      userId: 'u', type: 'EXPENSE', amount: 100, walletId: 'loan',
    })).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(committed).toHaveLength(0);
  });

  it('PM-STAB-007: allows INCOME into an ASSET wallet', async () => {
    const { db, net } = makeDb();
    db.wallet.findFirst = ownedWallets({ bank: { type: 'BANK', balance: D(500) } });
    const created = await svc(db).createTransaction({ userId: 'u', type: 'INCOME', amount: 100, walletId: 'bank' });
    expect(created.type).toBe('INCOME');
    expect(net('bank')).toBe(100);
  });

  it.each(['CREDIT_CARD', 'PAYLATER', 'LOAN'])(
    'PM-STAB-007: rejects INCOME into a %s (DEBT) wallet before any write',
    async (debtType) => {
      const { db, committed } = makeDb();
      db.wallet.findFirst = ownedWallets({ debt: { type: debtType, balance: D(-300) } });

      await expect(svc(db).createTransaction({
        userId: 'u', type: 'INCOME', amount: 100, walletId: 'debt',
      })).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });

      // No partial write: no balance change, no $transaction attempted.
      expect(committed).toHaveLength(0);
      expect(db.$transaction).not.toHaveBeenCalled();
    }
  );

  it('PM-STAB-007: enforces user isolation for the INCOME/DEBT guard (unowned wallet 404s, no leak of type)', async () => {
    const { db, committed } = makeDb();
    // Wallet belongs to another user — findFirst scoped by { id, userId } returns null.
    db.wallet.findFirst = ownedWallets({});

    await expect(svc(db).createTransaction({
      userId: 'u', type: 'INCOME', amount: 100, walletId: 'someone-elses-card',
    })).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(committed).toHaveLength(0);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('requires firstDueDate when the credit cycle is incomplete', async () => {
    const { db } = makeDb();
    db.wallet.findFirst = ownedWallets({
      cc: { type: 'CREDIT_CARD', balance: D(0), creditLimit: D(1000), cutoffDay: null, paymentDueDay: null },
    });

    await expect(svc(db).createTransaction({
      userId: 'u', type: 'EXPENSE', amount: 100, walletId: 'cc', billingMode: 'FULL',
    })).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
  });

  it('rejects an invalid amount before any write', async () => {
    const { db, committed } = makeDb();
    db.wallet.findFirst = ownedWallets({ w1: { type: 'CASH' } });
    await expect(
      svc(db).createTransaction({ userId: 'u', type: 'EXPENSE', amount: 0, walletId: 'w1' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(committed).toHaveLength(0);
  });

  it('rejects an unowned source wallet', async () => {
    const { db } = makeDb();
    db.wallet.findFirst = ownedWallets({}); // nothing owned
    await expect(
      svc(db).createTransaction({ userId: 'u', type: 'EXPENSE', amount: 10, walletId: 'w1' })
    ).rejects.toMatchObject({ statusCode: 404, message: 'Wallet tidak ditemukan' });
  });

  it('rejects an unowned destination wallet', async () => {
    const { db, committed } = makeDb();
    db.wallet.findFirst = ownedWallets({ src: { type: 'CASH', balance: D(100) } }); // dst missing
    await expect(
      svc(db).createTransaction({ userId: 'u', type: 'TRANSFER', amount: 10, walletId: 'src', toWalletId: 'dst' })
    ).rejects.toMatchObject({ statusCode: 404, message: 'Wallet tujuan tidak ditemukan' });
    expect(committed).toHaveLength(0);
  });

  it('rejects a self-transfer with INVALID_TRANSFER', async () => {
    const { db } = makeDb();
    db.wallet.findFirst = ownedWallets({ w1: { type: 'CASH' } });
    await expect(
      svc(db).createTransaction({ userId: 'u', type: 'TRANSFER', amount: 10, walletId: 'w1', toWalletId: 'w1' })
    ).rejects.toMatchObject({ code: 'INVALID_TRANSFER', statusCode: 400 });
  });

  it('performs every balance write inside one $transaction', async () => {
    const { db } = makeDb();
    db.wallet.findFirst = ownedWallets({ w1: { type: 'CASH' } });
    await svc(db).createTransaction({ userId: 'u', type: 'INCOME', amount: 100, walletId: 'w1' });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back all writes when a step inside the transaction fails', async () => {
    const { db, net, committed } = makeDb({ failInstallmentUpdate: true });
    db.wallet.findFirst = ownedWallets({
      cc: { type: 'CREDIT_CARD', balance: D(0), creditLimit: D(1000), cutoffDay: 20, paymentDueDay: 5 },
    });
    await expect(
      svc(db).createTransaction({
        userId: 'u', type: 'EXPENSE', amount: 300, walletId: 'cc',
        isInstallment: true, installmentMonths: 3, interestRate: 0,
      })
    ).rejects.toThrow();
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(committed).toHaveLength(0); // wallet decrement was buffered, never committed
    expect(net('cc')).toBe(0);
  });
});

describe('transactionService.updateTransaction', () => {
  it('reverses the old amount and applies the new one (EXPENSE)', async () => {
    const { db, net } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'w1', toWalletId: null, isInstallment: false,
    }));
    await svc(db).updateTransaction({ userId: 'u', id: 't1', amount: 150 });
    expect(net('w1')).toBe(-50); // +100 reverse, -150 apply
  });

  it('moves the effect when the source wallet changes', async () => {
    const { db, net } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'w1', toWalletId: null, isInstallment: false,
    }));
    db.wallet.findFirst = ownedWallets({ w2: {} });
    await svc(db).updateTransaction({ userId: 'u', id: 't1', walletId: 'w2' });
    expect(net('w1')).toBe(100); // reverse original
    expect(net('w2')).toBe(-100); // apply to new source
  });

  it('re-balances when a transfer destination changes', async () => {
    const { db, net } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: 'dst', isInstallment: false,
    }));
    db.wallet.findFirst = ownedWallets({ src: { type: 'BANK', balance: D(500) }, dst2: {} });
    await svc(db).updateTransaction({ userId: 'u', id: 't1', toWalletId: 'dst2' });
    expect(net('src')).toBe(0); // +100 reverse, -100 apply
    expect(net('dst')).toBe(-100); // reverse the old credit
    expect(net('dst2')).toBe(100); // credit the new destination
  });

  it('rejects changing a transfer source to a liability', async () => {
    const { db, committed } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'TRANSFER', amount: D(100), walletId: 'bank', toWalletId: 'loan', isInstallment: false,
    }));
    db.wallet.findFirst = ownedWallets({
      card: { type: 'CREDIT_CARD', balance: D(-100) },
      loan: { type: 'LOAN', balance: D(-500) },
    });

    await expect(svc(db).updateTransaction({ userId: 'u', id: 't1', walletId: 'card' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_TRANSFER' });
    expect(committed).toHaveLength(0);
  });

  it('PM-STAB-007: rejects retargeting an INCOME transaction onto a DEBT wallet', async () => {
    const { db, committed } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'INCOME', amount: D(100), walletId: 'bank', toWalletId: null, isInstallment: false,
    }));
    db.wallet.findFirst = ownedWallets({ card: { type: 'CREDIT_CARD', balance: D(-100) } });

    await expect(svc(db).updateTransaction({ userId: 'u', id: 't1', walletId: 'card' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(committed).toHaveLength(0);
  });

  it('PM-STAB-007: rejects flipping an EXPENSE into INCOME on a DEBT wallet', async () => {
    const { db, committed } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'card', toWalletId: null, isInstallment: false,
    }));
    db.wallet.findFirst = ownedWallets({ card: { type: 'CREDIT_CARD', balance: D(-100) } });

    await expect(svc(db).updateTransaction({ userId: 'u', id: 't1', type: 'INCOME' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(committed).toHaveLength(0);
  });

  it('refuses to edit an installment transaction', async () => {
    const { db, committed } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(50), walletId: 'w1', toWalletId: null, isInstallment: true,
    }));
    await expect(svc(db).updateTransaction({ userId: 'u', id: 't1', amount: 60 }))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(committed).toHaveLength(0);
  });

  it('refuses to edit a legacy transfer with no destination', async () => {
    const { db } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: null, isInstallment: false,
    }));
    await expect(svc(db).updateTransaction({ userId: 'u', id: 't1', amount: 150 }))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('404s for a transaction the caller does not own', async () => {
    const { db } = makeDb();
    db.transaction.findFirst = vi.fn(async () => null);
    await expect(svc(db).updateTransaction({ userId: 'u', id: 'nope', amount: 1 }))
      .rejects.toMatchObject({ statusCode: 404, code: 'TRANSACTION_NOT_FOUND' });
  });

  it("rejects another user's categoryId before any write", async () => {
    const { db, committed } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'w1', toWalletId: null, isInstallment: false,
    }));
    db.category.findFirst = vi.fn(async () => null); // not found under { id, userId }
    await expect(svc(db).updateTransaction({ userId: 'u', id: 't1', categoryId: 'cat-of-other-user' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' });
    expect(db.category.findFirst).toHaveBeenCalledWith({ where: { id: 'cat-of-other-user', userId: 'u' } });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(committed).toHaveLength(0);
  });

  it('accepts an owned categoryId and persists it', async () => {
    const { db } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'w1', toWalletId: null, isInstallment: false,
    }));
    db.category.findFirst = vi.fn(async ({ where }: any) => ({ id: where.id, userId: where.userId, type: 'EXPENSE' }));
    const updated = await svc(db).updateTransaction({ userId: 'u', id: 't1', categoryId: 'c1' });
    expect((updated as any).categoryId).toBe('c1');
  });

  it('rejects clearing the required category on an expense', async () => {
    const { db } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'w1', toWalletId: null, isInstallment: false,
    }));
    db.category.findFirst = vi.fn();
    await expect(svc(db).updateTransaction({ userId: 'u', id: 't1', categoryId: '' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(db.category.findFirst).not.toHaveBeenCalled();
  });

  it('rejects an update category whose type does not match the transaction', async () => {
    const { db } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'w1', toWalletId: null, isInstallment: false,
    }));
    db.category.findFirst = vi.fn(async () => ({ id: 'income-cat', userId: 'u', type: 'INCOME' }));

    await expect(svc(db).updateTransaction({ userId: 'u', id: 't1', categoryId: 'income-cat' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('transactionService.deleteTransaction', () => {
  it('refunds an EXPENSE', async () => {
    const { db, net } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'w1', toWalletId: null, isInstallment: false, installment: null,
    }));
    const res = await svc(db).deleteTransaction({ userId: 'u', id: 't1' });
    expect(res).toEqual({ id: 't1' });
    expect(net('w1')).toBe(100);
  });

  it('restores both wallets for a TRANSFER', async () => {
    const { db, net, aggregate } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: 'dst', isInstallment: false, installment: null,
    }));
    await svc(db).deleteTransaction({ userId: 'u', id: 't1' });
    expect(net('src')).toBe(100);
    expect(net('dst')).toBe(-100);
    expect(aggregate()).toBe(0);
  });

  it('refunds the full grandTotal for an installment', async () => {
    const { db, net } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'EXPENSE', amount: D(100), walletId: 'cc', toWalletId: null,
      isInstallment: true, installmentId: 'i1', installment: { id: 'i1', grandTotal: D(600) },
    }));
    await svc(db).deleteTransaction({ userId: 'u', id: 't1' });
    expect(net('cc')).toBe(600);
  });

  it('refuses to delete a legacy transfer', async () => {
    const { db, committed } = makeDb();
    db.transaction.findFirst = vi.fn(async () => ({
      id: 't1', type: 'TRANSFER', amount: D(100), walletId: 'src', toWalletId: null, isInstallment: false, installment: null,
    }));
    await expect(svc(db).deleteTransaction({ userId: 'u', id: 't1' }))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(committed).toHaveLength(0);
  });

  it('throws typed TransactionErrors that carry status and code', async () => {
    const { db } = makeDb();
    db.transaction.findFirst = vi.fn(async () => null);
    const err = await svc(db).deleteTransaction({ userId: 'u', id: 'x' }).catch((e) => e);
    expect(err).toBeInstanceOf(TransactionError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('TRANSACTION_NOT_FOUND');
  });
});
