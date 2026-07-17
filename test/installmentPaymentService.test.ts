import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createInstallmentPaymentService } from '../src/services/installment-payment.service';
import type { InstallmentPaymentPrismaClient } from '../src/services/installment-payment.types';

const D = (n: number | string) => new Prisma.Decimal(n);

function makeInstallment(over: Record<string, unknown> = {}) {
  return {
    id: 'inst-1',
    userId: 'user-1',
    walletId: 'debt-1',
    wallet: { id: 'debt-1', userId: 'user-1', name: 'Kartu Kredit BCA', type: 'CREDIT_CARD' },
    monthlyAmount: D(2500000),
    currentTerm: 1,
    paidTerms: 0,
    installmentMonths: 3,
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
});
