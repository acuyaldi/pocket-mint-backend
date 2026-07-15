import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';

const D = (n: number | string) => new Prisma.Decimal(n);

// Mock the QUERY SERVICE so these tests observe only the controller boundary, and
// mock prisma so we can assert the handler never touches the database directly.
const h = vi.hoisted(() => ({
  queryService: { listInstallments: vi.fn() },
  paymentService: { payInstallment: vi.fn() },
  prismaMock: { installment: { findMany: vi.fn() } },
}));

vi.mock('../src/services/installment-query.service', () => ({ installmentQueryService: h.queryService }));
vi.mock('../src/services/installment-payment.service', () => ({ installmentPaymentService: h.paymentService }));
vi.mock('../src/lib/prisma', () => ({ default: h.prismaMock }));

import { getInstallments, getPaylaterRates, payInstallment } from '../src/controllers/installment.controller';
import { InstallmentError } from '../src/services/installment.errors';
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
  app.use(express.json());
  app.get('/installments', getInstallments);
  app.get('/installments/rates', getPaylaterRates);
  app.post('/installments/:id/pay', payInstallment);
  app.use(errorHandler);
  return app;
}

/** One installment row as the service would return it (Decimals + wallet include). */
function makeRow(over: Record<string, unknown> = {}) {
  return {
    id: 'inst-1',
    description: 'Laptop',
    walletId: 'w1',
    monthlyAmount: D('362833.33'),
    currentTerm: 1,
    installmentMonths: 3,
    totalAmount: D('1000000'),
    grandTotal: D('1088500'),
    totalInterest: D('88500'),
    interestRate: D('2.95'),
    status: 'ACTIVE',
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    balanceDeducted: true,
    wallet: { id: 'w1', name: 'Kredivo', type: 'LOAN_PAYLATER' },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('installment controllers — boundary', () => {
  it('getInstallments: maps userId + status, calls listInstallments once, serializes Decimals, 200', async () => {
    h.queryService.listInstallments.mockResolvedValue([makeRow()]);

    const res = await request(buildApp()).get('/installments?status=ACTIVE');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Retrieved installments');
    expect(h.queryService.listInstallments).toHaveBeenCalledTimes(1);
    expect(h.queryService.listInstallments).toHaveBeenCalledWith({ userId: USER, status: 'ACTIVE' });

    expect(res.body.data[0]).toEqual({
      id: 'inst-1',
      description: 'Laptop',
      walletId: 'w1',
      walletName: 'Kredivo',
      walletType: 'LOAN_PAYLATER',
      monthlyAmount: 362833.33,
      currentTerm: 1,
      installmentMonths: 3,
      totalAmount: 1000000,
      grandTotal: 1088500,
      totalInterest: 88500,
      interestRate: 2.95,
      status: 'ACTIVE',
      startDate: '2026-07-01T00:00:00.000Z',
      balanceDeducted: true,
    });
    // The handler must never touch the database directly.
    expect(h.prismaMock.installment.findMany).not.toHaveBeenCalled();
  });

  it('getInstallments: passes status undefined when the query param is absent', async () => {
    h.queryService.listInstallments.mockResolvedValue([]);
    const res = await request(buildApp()).get('/installments');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(h.queryService.listInstallments).toHaveBeenCalledWith({ userId: USER, status: undefined });
  });

  it('getInstallments: collapses an array-shaped status to a scalar before the service', async () => {
    h.queryService.listInstallments.mockResolvedValue([]);
    await request(buildApp()).get('/installments?status=ACTIVE&status=SETTLED');
    expect(h.queryService.listInstallments).toHaveBeenCalledWith({ userId: USER, status: 'ACTIVE' });
  });

  it('getInstallments: 401 when no authenticated user, service not called', async () => {
    const res = await request(buildApp(false)).get('/installments');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(h.queryService.listInstallments).not.toHaveBeenCalled();
  });

  it('getInstallments: forwards a typed InstallmentError (invalid status) with exact status/code/message', async () => {
    h.queryService.listInstallments.mockRejectedValue(
      new InstallmentError('Invalid status. Allowed: ACTIVE, SETTLED, CANCELLED', 400, 'BAD_REQUEST'),
    );

    const res = await request(buildApp()).get('/installments?status=PAID');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toBe('Invalid status. Allowed: ACTIVE, SETTLED, CANCELLED');
  });

  it('getInstallments: passes an unexpected error to the central error handler (no manual 500)', async () => {
    h.queryService.listInstallments.mockRejectedValue(new Error('db exploded'));

    const res = await request(buildApp()).get('/installments');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.requestId).toBeTruthy(); // came from errorHandler, not a manual send
  });

  it('getPaylaterRates: returns the static rates without auth or database access', async () => {
    const res = await request(buildApp(false)).get('/installments/rates');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Retrieved paylater rates');
    expect(res.body.data).toContainEqual({ match: 'kredivo', name: 'Kredivo', rate: 2.6, adminFee: 0 });
    expect(h.prismaMock.installment.findMany).not.toHaveBeenCalled();
  });

  it('payInstallment: maps auth, route id, and allowlisted body into the payment service', async () => {
    h.paymentService.payInstallment.mockResolvedValue({
      installment: {
        ...makeRow({ currentTerm: 2, status: 'ACTIVE' }),
        userId: USER,
        wallet: { id: 'w1', name: 'Kredivo', type: 'LOAN_PAYLATER' },
      },
      transaction: {
        id: 'tx-pay',
        userId: USER,
        walletId: 'asset-1',
        toWalletId: 'w1',
        type: 'TRANSFER',
        amount: D(362833.33),
        description: 'Pembayaran cicilan — Laptop',
        note: null,
        date: new Date('2026-07-15T00:00:00.000Z'),
        isInstallment: false,
        installmentMonths: null,
        interestRate: null,
        currentTerm: null,
        installmentId: null,
        categoryId: null,
        createdAt: new Date('2026-07-15T00:00:00.000Z'),
        updatedAt: new Date('2026-07-15T00:00:00.000Z'),
        wallet: { id: 'asset-1', name: 'BCA Debit', type: 'BANK' },
        toWallet: { id: 'w1', name: 'Kredivo', type: 'LOAN_PAYLATER' },
      },
    });

    const res = await request(buildApp())
      .post('/installments/inst-1/pay')
      .send({
        sourceWalletId: 'asset-1',
        amount: 362833.33,
        date: '2026-07-15',
        ignored: 'field',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Installment payment recorded');
    expect(h.paymentService.payInstallment).toHaveBeenCalledWith({
      userId: USER,
      installmentId: 'inst-1',
      sourceWalletId: 'asset-1',
      amount: 362833.33,
      date: '2026-07-15',
    });
    expect(res.body.data.installment.currentTerm).toBe(2);
    expect(res.body.data.transaction.amount).toBe(362833.33);
  });

  it('payInstallment: forwards typed payment errors through the central handler', async () => {
    h.paymentService.payInstallment.mockRejectedValue(
      new InstallmentError('Saldo rekening sumber tidak cukup', 400, 'INSUFFICIENT_FUNDS'),
    );

    const res = await request(buildApp())
      .post('/installments/inst-1/pay')
      .send({ sourceWalletId: 'asset-1', amount: 362833.33 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    expect(res.body.error.message).toBe('Saldo rekening sumber tidak cukup');
  });
});
