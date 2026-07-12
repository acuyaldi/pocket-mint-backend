import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

// The service module builds a default instance from the shared Prisma singleton
// at import time. Stub that singleton so importing the module doesn't construct a
// real client — every test injects its own fake via createInstallmentQueryService.
vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createInstallmentQueryService } from '../src/services/installment-query.service';
import { InstallmentError } from '../src/services/installment.errors';
import type { InstallmentQueryPrismaClient } from '../src/services/installment-query.types';

const D = (n: number | string) => new Prisma.Decimal(n);
const USER = 'user-1';

// A minimal installment row shaped like the Prisma payload the service returns
// (Decimal money fields + the wallet relation `include`). Overridable per test.
function makeRow(over: Record<string, unknown> = {}) {
  return {
    id: 'inst-1',
    userId: USER,
    walletId: 'w1',
    totalAmount: D('1000000'),
    interestRate: D('2.95'),
    totalInterest: D('88500'),
    adminFee: D('0'),
    adminFeeType: 'FLAT',
    totalAdminFee: D('0'),
    grandTotal: D('1088500'),
    installmentMonths: 3,
    currentTerm: 1,
    monthlyAmount: D('362833.33'),
    status: 'ACTIVE',
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    description: 'Laptop',
    balanceDeducted: true,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    wallet: { id: 'w1', name: 'Kredivo', type: 'LOAN_PAYLATER' },
    ...over,
  };
}

const h = vi.hoisted(() => ({ findMany: vi.fn() }));

/** A behaviour fake for the narrow read Prisma slice the service depends on. */
const dbFake = { installment: { findMany: h.findMany } } as unknown as InstallmentQueryPrismaClient;

const service = createInstallmentQueryService(dbFake);

beforeEach(() => {
  vi.clearAllMocks();
  h.findMany.mockResolvedValue([]);
});

describe('installment query service — listInstallments', () => {
  it('scopes to the authenticated user, orders startDate desc, includes wallet fields', async () => {
    await service.listInstallments({ userId: USER });

    expect(h.findMany).toHaveBeenCalledTimes(1);
    expect(h.findMany).toHaveBeenCalledWith({
      where: { userId: USER },
      include: { wallet: { select: { id: true, name: true, type: true } } },
      orderBy: { startDate: 'desc' },
    });
  });

  it('applies a valid status filter', async () => {
    await service.listInstallments({ userId: USER, status: 'SETTLED' });

    expect(h.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER, status: 'SETTLED' } }),
    );
  });

  it('treats an absent status as no filter', async () => {
    await service.listInstallments({ userId: USER, status: undefined });
    expect(h.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: USER } }));
  });

  it('treats an empty-string status as no filter (lenient, matches old behaviour)', async () => {
    await service.listInstallments({ userId: USER, status: '' });
    expect(h.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: USER } }));
  });

  it('throws a typed 400 BAD_REQUEST for an invalid status, before any read', async () => {
    await expect(
      service.listInstallments({ userId: USER, status: 'PAID' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST', isOperational: true });
    await expect(
      service.listInstallments({ userId: USER, status: 'PAID' }),
    ).rejects.toBeInstanceOf(InstallmentError);
    expect(h.findMany).not.toHaveBeenCalled();
  });

  it('returns rows with Decimal money fields intact (no serialization in the service)', async () => {
    h.findMany.mockResolvedValue([makeRow()]);
    const [row] = await service.listInstallments({ userId: USER });
    expect(row.grandTotal).toBeInstanceOf(Prisma.Decimal);
    expect(row.monthlyAmount.toString()).toBe('362833.33');
    expect(row.wallet).toEqual({ id: 'w1', name: 'Kredivo', type: 'LOAN_PAYLATER' });
  });

  it('returns an empty array when the user has no installments', async () => {
    h.findMany.mockResolvedValue([]);
    expect(await service.listInstallments({ userId: USER })).toEqual([]);
  });

  it('propagates an unexpected database failure untyped', async () => {
    h.findMany.mockRejectedValue(new Error('db exploded'));
    await expect(service.listInstallments({ userId: USER })).rejects.toThrow('db exploded');
  });
});
