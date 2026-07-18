import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createInstallmentPaymentService } from '../src/services/installment-payment.service';
import { computeFinalMonthlyAmount } from '../src/domain/installment';
import type { InstallmentPaymentPrismaClient } from '../src/services/installment-payment.types';

const D = (n: number | string) => new Prisma.Decimal(n);

function makeInstallment(over: Record<string, unknown> = {}) {
  const installmentMonths = (over.installmentMonths as number) ?? 3;
  const monthlyAmount = (over.monthlyAmount as Prisma.Decimal) ?? D(2500000);
  return {
    id: 'inst-1',
    userId: 'user-1',
    walletId: 'debt-1',
    wallet: { id: 'debt-1', userId: 'user-1', name: 'Kartu Kredit BCA', type: 'CREDIT_CARD' },
    monthlyAmount,
    // Default: divides evenly, so grandTotal = monthlyAmount × months unless overridden.
    grandTotal: monthlyAmount.times(installmentMonths),
    currentTerm: 1,
    paidTerms: 0,
    installmentMonths,
    kind: 'INSTALLMENT',
    nextDueDate: new Date('2026-08-04T17:00:00.000Z'),
    status: 'ACTIVE',
    description: 'Tagihan Kartu Kredit',
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    ...over,
  };
}

function makeSource(over: Record<string, unknown> = {}) {
  return {
    id: 'asset-1',
    userId: 'user-1',
    name: 'BCA Debit',
    type: 'BANK',
    balance: D(7000000),
    ...over,
  };
}

function makeDb() {
  const committed: { id: string; delta: number }[] = [];
  const installmentFindFirst = vi.fn();
  const walletFindFirst = vi.fn();
  const transactionCreate = vi.fn(async ({ data }: any) => ({ id: 'tx-pay', ...data }));
  const installmentUpdate = vi.fn(async ({ where, data }: any) => ({
    id: where.id,
    ...data,
  }));

  const txClient = (buffer: { id: string; delta: number }[]) => ({
    transaction: { create: transactionCreate },
    installment: { update: installmentUpdate },
    wallet: {
      update: vi.fn(async ({ where, data }: any) => {
        buffer.push({ id: where.id, delta: Number(data.balance.increment.toString()) });
      }),
    },
  });

  const db = {
    installment: { findFirst: installmentFindFirst },
    wallet: { findFirst: walletFindFirst },
    transaction: {},
    $transaction: vi.fn(async (cb: (tx: any) => Promise<unknown>) => {
      const buffer: { id: string; delta: number }[] = [];
      const result = await cb(txClient(buffer));
      committed.push(...buffer);
      return result;
    }),
  } as unknown as InstallmentPaymentPrismaClient;

  const net = (id: string) =>
    committed.filter((item) => item.id === id).reduce((sum, item) => sum + item.delta, 0);

  return {
    db,
    installmentFindFirst,
    walletFindFirst,
    transactionCreate,
    installmentUpdate,
    net,
  };
}

describe('installment payment service', () => {
  it('creates a repayment transfer, credits the debt wallet, and advances the term', async () => {
    const h = makeDb();
    h.installmentFindFirst.mockResolvedValue(makeInstallment({ paidTerms: 0, currentTerm: 1, installmentMonths: 3 }));
    h.walletFindFirst.mockResolvedValue(makeSource());

    const result = await createInstallmentPaymentService(h.db).payInstallment({
      userId: 'user-1',
      installmentId: 'inst-1',
      sourceWalletId: 'asset-1',
      amount: D(2500000),
      date: '2026-07-15',
    });

    expect(result.transaction.type).toBe('TRANSFER');
    expect(result.installment.currentTerm).toBe(2);
    expect(result.installment.paidTerms).toBe(1);
    expect(result.installment.status).toBe('ACTIVE');
    expect(result.installment.nextDueDate.toISOString()).toBe('2026-09-04T17:00:00.000Z');
    expect(h.net('asset-1')).toBe(-2500000);
    expect(h.net('debt-1')).toBe(2500000);
  });

  it('marks the installment settled when paying the final term', async () => {
    const h = makeDb();
    h.installmentFindFirst.mockResolvedValue(makeInstallment({ paidTerms: 2, currentTerm: 3, installmentMonths: 3 }));
    h.walletFindFirst.mockResolvedValue(makeSource());

    const result = await createInstallmentPaymentService(h.db).payInstallment({
      userId: 'user-1',
      installmentId: 'inst-1',
      sourceWalletId: 'asset-1',
      amount: D(2500000),
      date: '2026-07-15',
    });

    expect(result.installment.currentTerm).toBe(3);
    expect(result.installment.paidTerms).toBe(3);
    expect(result.installment.status).toBe('SETTLED');
  });

  it('accepts payment from an e-wallet source', async () => {
    const h = makeDb();
    h.installmentFindFirst.mockResolvedValue(makeInstallment());
    h.walletFindFirst.mockResolvedValue(makeSource({ type: 'E_WALLET' }));

    await createInstallmentPaymentService(h.db).payInstallment({
      userId: 'user-1',
      installmentId: 'inst-1',
      sourceWalletId: 'asset-1',
      amount: D(2500000),
      date: '2026-07-15',
    });

    expect(h.net('asset-1')).toBe(-2500000);
    expect(h.net('debt-1')).toBe(2500000);
  });

  it('settles a FULL bill when amount is omitted', async () => {
    const h = makeDb();
    h.installmentFindFirst.mockResolvedValue(makeInstallment({
      kind: 'FULL',
      paidTerms: 0,
      installmentMonths: 1,
      monthlyAmount: D(400000),
    }));
    h.walletFindFirst.mockResolvedValue(makeSource());

    const result = await createInstallmentPaymentService(h.db).payInstallment({
      userId: 'user-1',
      installmentId: 'inst-1',
      sourceWalletId: 'asset-1',
      date: '2026-07-15',
    });

    expect(result.installment.paidTerms).toBe(1);
    expect(result.installment.status).toBe('SETTLED');
    expect(h.net('asset-1')).toBe(-400000);
  });

  it('rejects payments larger than the monthly amount', async () => {
    const h = makeDb();
    h.installmentFindFirst.mockResolvedValue(makeInstallment());
    h.walletFindFirst.mockResolvedValue(makeSource());

    await expect(
      createInstallmentPaymentService(h.db).payInstallment({
        userId: 'user-1',
        installmentId: 'inst-1',
        sourceWalletId: 'asset-1',
        amount: D(3000000),
        date: '2026-07-15',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_AMOUNT' });
  });

  it('PM-STAB-006: evenly divisible grandTotal — final term equals the regular monthly amount', async () => {
    // 7500000 / 3 = 2500000 exactly, so finalMonthlyAmount === monthlyAmount here.
    const h = makeDb();
    h.installmentFindFirst.mockResolvedValue(
      makeInstallment({ paidTerms: 2, currentTerm: 3, installmentMonths: 3, monthlyAmount: D(2500000) }),
    );
    h.walletFindFirst.mockResolvedValue(makeSource());

    const result = await createInstallmentPaymentService(h.db).payInstallment({
      userId: 'user-1',
      installmentId: 'inst-1',
      sourceWalletId: 'asset-1',
      date: '2026-07-15',
    });

    expect(result.transaction.amount.toString()).toBe('2500000');
    expect(result.installment.status).toBe('SETTLED');
  });

  it('PM-STAB-006: grandTotal not evenly divisible — final term absorbs the rounding remainder to exactly zero out the debt', async () => {
    // principal 100000, 2.6%/mo, 3 months → grandTotal 107800, monthlyAmount round(107800/3) = 35933.33,
    // finalMonthlyAmount = 107800 - 35933.33*2 = 35933.34 (one cent above the regular term).
    const grandTotal = D('107800');
    const monthlyAmount = D('35933.33');
    const installmentMonths = 3;
    const finalMonthlyAmount = computeFinalMonthlyAmount(grandTotal, monthlyAmount, installmentMonths);
    expect(finalMonthlyAmount.toString()).toBe('35933.34');

    const h = makeDb();
    h.installmentFindFirst.mockResolvedValue(
      makeInstallment({ paidTerms: 2, currentTerm: 3, installmentMonths, monthlyAmount, grandTotal }),
    );
    h.walletFindFirst.mockResolvedValue(makeSource({ balance: D(1000000) }));

    // Paying the regular monthlyAmount on the final term must be rejected —
    // it would leave a 0.01 remainder on the debt wallet forever.
    await expect(
      createInstallmentPaymentService(h.db).payInstallment({
        userId: 'user-1',
        installmentId: 'inst-1',
        sourceWalletId: 'asset-1',
        amount: monthlyAmount,
        date: '2026-07-15',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_AMOUNT' });

    // Omitting amount (or passing the exact final amount) settles the debt to zero.
    const result = await createInstallmentPaymentService(h.db).payInstallment({
      userId: 'user-1',
      installmentId: 'inst-1',
      sourceWalletId: 'asset-1',
      date: '2026-07-15',
    });

    expect(result.transaction.amount.toString()).toBe('35933.34');
    expect(result.installment.status).toBe('SETTLED');
    // Two regular terms (already paid, outside this test) + this final term must sum to grandTotal exactly.
    const scheduleSum = monthlyAmount.times(installmentMonths - 1).plus(D(result.transaction.amount.toString()));
    expect(scheduleSum.toString()).toBe(grandTotal.toString());
    expect(h.net('debt-1')).toBe(35933.34);
  });

  it('PM-STAB-006: rejects a payment attempt on an already-settled installment (no double deduction)', async () => {
    const h = makeDb();
    h.installmentFindFirst.mockResolvedValue(
      makeInstallment({ paidTerms: 3, currentTerm: 3, installmentMonths: 3, status: 'SETTLED' }),
    );
    h.walletFindFirst.mockResolvedValue(makeSource());

    await expect(
      createInstallmentPaymentService(h.db).payInstallment({
        userId: 'user-1',
        installmentId: 'inst-1',
        sourceWalletId: 'asset-1',
        date: '2026-07-15',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });

    expect(h.transactionCreate).not.toHaveBeenCalled();
    expect(h.installmentUpdate).not.toHaveBeenCalled();
  });

  it('PM-STAB-006: rolls back the transaction record when the balance deduction fails', async () => {
    const installmentUpdate = vi.fn();
    const transactionCreate = vi.fn(async ({ data }: any) => ({ id: 'tx-pay', ...data }));
    const walletUpdate = vi.fn(async () => {
      throw new Error('balance update failed');
    });

    const db = {
      installment: {
        findFirst: vi.fn().mockResolvedValue(makeInstallment()),
        update: installmentUpdate,
      },
      wallet: {
        findFirst: vi.fn().mockResolvedValue(makeSource()),
        update: walletUpdate,
      },
      transaction: { create: transactionCreate },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<unknown>) =>
        cb({
          transaction: { create: transactionCreate },
          installment: { update: installmentUpdate },
          wallet: { update: walletUpdate },
        }),
      ),
    } as unknown as InstallmentPaymentPrismaClient;

    await expect(
      createInstallmentPaymentService(db).payInstallment({
        userId: 'user-1',
        installmentId: 'inst-1',
        sourceWalletId: 'asset-1',
        amount: D(2500000),
        date: '2026-07-15',
      }),
    ).rejects.toThrow('balance update failed');

    // The transaction row was created inside the same $transaction callback that
    // threw — a real Prisma client rolls the whole callback back, so the term
    // must not have been advanced.
    expect(installmentUpdate).not.toHaveBeenCalled();
  });
});
