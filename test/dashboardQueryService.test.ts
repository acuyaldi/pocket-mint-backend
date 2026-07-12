import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

// The service module builds a default instance from the shared Prisma singleton
// at import time. Stub that singleton so importing the module doesn't construct a
// real client — every test injects its own fake via createDashboardQueryService.
vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createDashboardQueryService } from '../src/services/dashboard-query.service';
import type { DashboardQueryPrismaClient } from '../src/services/dashboard-query.types';

const D = (n: number | string) => new Prisma.Decimal(n);

/** Behavior-focused read-only fake Prisma; captures args and returns injected rows. */
function makeDb(opts: { wallets?: unknown[] } = {}) {
  return {
    wallet: {
      findMany: vi.fn(async () => opts.wallets ?? []),
    },
  };
}

const svc = (db: unknown) => createDashboardQueryService(db as DashboardQueryPrismaClient);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const firstArg = (fn: any) => fn.mock.calls[0][0];

const MIXED = [
  { type: 'CASH', balance: D('100.50') },
  { type: 'BANK', balance: D('200.00') },
  { type: 'E_WALLET', balance: D('50.25') },
  { type: 'CREDIT_CARD', balance: D('-300.00') },
  { type: 'LOAN_PAYLATER', balance: D('-1000.50') },
];

describe('dashboardQueryService.getSummary', () => {
  it('scopes reads to the authenticated user and selects only type + balance', async () => {
    const db = makeDb({ wallets: MIXED });
    await svc(db).getSummary({ userId: 'u1' });
    const args = firstArg(db.wallet.findMany);
    expect(args.where).toEqual({ userId: 'u1' });
    expect(args.select).toEqual({ type: true, balance: true });
  });

  it('includes archived wallets (no isArchived filter)', async () => {
    const db = makeDb({ wallets: MIXED });
    await svc(db).getSummary({ userId: 'u1' });
    expect(firstArg(db.wallet.findMany).where).not.toHaveProperty('isArchived');
  });

  it('performs exactly one database call', async () => {
    const db = makeDb({ wallets: MIXED });
    await svc(db).getSummary({ userId: 'u1' });
    expect(db.wallet.findMany).toHaveBeenCalledTimes(1);
  });

  it('sums asset balances into totalAset with Decimal arithmetic (cents preserved)', async () => {
    const db = makeDb({ wallets: MIXED });
    const totals = await svc(db).getSummary({ userId: 'u1' });
    expect(totals.totalAset).toBeInstanceOf(Prisma.Decimal);
    expect(totals.totalAset.toString()).toBe('350.75');
  });

  it('sums the ABSOLUTE debt balances into totalUtang (debt reported separately)', async () => {
    const db = makeDb({ wallets: MIXED });
    const totals = await svc(db).getSummary({ userId: 'u1' });
    expect(totals.totalUtang.toString()).toBe('1300.5');
  });

  it('reports netWorth as the asset total only (debt never subtracted)', async () => {
    const db = makeDb({ wallets: MIXED });
    const totals = await svc(db).getSummary({ userId: 'u1' });
    expect(totals.netWorth.toString()).toBe('350.75');
    expect(totals.netWorth.toString()).toBe(totals.totalAset.toString());
  });

  it('returns Decimal zeros for a user with no wallets (valid zeroed summary)', async () => {
    const db = makeDb({ wallets: [] });
    const totals = await svc(db).getSummary({ userId: 'u1' });
    expect(totals.totalAset.toString()).toBe('0');
    expect(totals.totalUtang.toString()).toBe('0');
    expect(totals.netWorth.toString()).toBe('0');
    expect(totals.netWorth).toBeInstanceOf(Prisma.Decimal);
  });

  it('propagates a Prisma failure instead of swallowing it (no mutation, no manual handling)', async () => {
    const db = makeDb();
    db.wallet.findMany = vi.fn(async () => { throw new Error('db down'); });
    await expect(svc(db).getSummary({ userId: 'u1' })).rejects.toThrow('db down');
  });
});
