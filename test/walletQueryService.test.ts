import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

// The service module builds a default instance from the shared Prisma singleton
// at import time. Stub that singleton so importing the module doesn't construct a
// real client — every test injects its own fake via createWalletQueryService.
vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createWalletQueryService } from '../src/services/wallet-query.service';
import { WalletError } from '../src/services/wallet.errors';
import { logger } from '../src/utils/logger';
import type { WalletQueryPrismaClient } from '../src/services/wallet-query.types';

const D = (n: number | string) => new Prisma.Decimal(n);

/** Behavior-focused read-only fake Prisma; captures args and returns injected rows. */
function makeDb(opts: { wallets?: unknown[]; wallet?: unknown; tx?: unknown[] } = {}) {
  return {
    wallet: {
      findMany: vi.fn(async () => opts.wallets ?? []),
      findFirst: vi.fn(async () => (opts.wallet ?? null) as unknown),
    },
    transaction: {
      findMany: vi.fn(async () => opts.tx ?? []),
    },
  };
}

const svc = (db: unknown) => createWalletQueryService(db as WalletQueryPrismaClient);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const firstArg = (fn: any) => fn.mock.calls[0][0];

// now = 2026-07-11T10:00Z → Jakarta (UTC+7, reporting tz) day = 2026-07-11.
// Rolling window: 2026-07-05 … 2026-07-11; half-open UTC bounds below. These are
// timezone-stable regardless of the server TZ because the reporting zone is fixed.
const NOW = new Date('2026-07-11T10:00:00.000Z');
const WINDOW = { gte: '2026-07-04T17:00:00.000Z', lt: '2026-07-11T17:00:00.000Z' };
const LABELS = ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11'];

// ────────────────────────────── listWallets ──────────────────────────────
describe('walletQueryService.listWallets', () => {
  it('scopes to the authenticated user and orders by createdAt asc', async () => {
    const db = makeDb();
    await svc(db).listWallets({ userId: 'u1' });
    const args = firstArg(db.wallet.findMany);
    expect(args.where).toEqual({ userId: 'u1' });
    expect(args.orderBy).toEqual({ createdAt: 'asc' });
  });

  it('includes archived wallets (no isArchived filter)', async () => {
    const db = makeDb();
    await svc(db).listWallets({ userId: 'u1' });
    expect(firstArg(db.wallet.findMany).where).not.toHaveProperty('isArchived');
  });

  it('returns rows unchanged with Decimals intact (serialization is the controller boundary)', async () => {
    const db = makeDb({ wallets: [{ id: 'w1', type: 'CASH', balance: D('100.25') }] });
    const result = await svc(db).listWallets({ userId: 'u1' });
    expect(result[0].balance).toBeInstanceOf(Prisma.Decimal);
    expect(result[0].balance.toString()).toBe('100.25');
  });

  it('returns an empty array for a user with no wallets', async () => {
    const db = makeDb({ wallets: [] });
    expect(await svc(db).listWallets({ userId: 'u1' })).toEqual([]);
  });

  it('propagates a Prisma failure instead of swallowing it', async () => {
    const db = makeDb();
    db.wallet.findMany = vi.fn(async () => { throw new Error('db down'); });
    await expect(svc(db).listWallets({ userId: 'u1' })).rejects.toThrow('db down');
  });
});

// ────────────────────────────── getNetWorth ──────────────────────────────
describe('walletQueryService.getNetWorth', () => {
  const MIXED = [
    { type: 'CASH', balance: D('100.50') },
    { type: 'BANK', balance: D('200.00') },
    { type: 'E_WALLET', balance: D('50.25') },
    { type: 'CREDIT_CARD', balance: D('-300.00') },
    { type: 'LOAN_PAYLATER', balance: D('-1000.50') },
  ];

  it('scopes to userId and selects only type + balance', async () => {
    const db = makeDb({ wallets: MIXED });
    await svc(db).getNetWorth({ userId: 'u1' });
    const args = firstArg(db.wallet.findMany);
    expect(args.where).toEqual({ userId: 'u1' });
    expect(args.select).toEqual({ type: true, balance: true });
  });

  it('sums asset balances into totalAset with Decimal arithmetic', async () => {
    const db = makeDb({ wallets: MIXED });
    const totals = await svc(db).getNetWorth({ userId: 'u1' });
    expect(totals.totalAset).toBeInstanceOf(Prisma.Decimal);
    expect(totals.totalAset.toString()).toBe('350.75');
  });

  it('sums the ABSOLUTE debt balances into totalUtang', async () => {
    const db = makeDb({ wallets: MIXED });
    const totals = await svc(db).getNetWorth({ userId: 'u1' });
    expect(totals.totalUtang.toString()).toBe('1300.5');
  });

  it('reports netWorth as assets minus outstanding debt (PD-001), negative allowed', async () => {
    const db = makeDb({ wallets: MIXED });
    const totals = await svc(db).getNetWorth({ userId: 'u1' });
    expect(totals.netWorth.toString()).toBe('-949.75');
    expect(totals.netWorth.toString()).toBe(totals.totalAset.minus(totals.totalUtang).toString());
  });

  it('equals totalAset when there is no debt (PD-001 zero-debt case)', async () => {
    const db = makeDb({ wallets: [
      { type: 'CASH', balance: D('100.50') },
      { type: 'BANK', balance: D('200.00') },
    ] });
    const totals = await svc(db).getNetWorth({ userId: 'u1' });
    expect(totals.totalUtang.toString()).toBe('0');
    expect(totals.netWorth.toString()).toBe('300.5');
    expect(totals.netWorth.toString()).toBe(totals.totalAset.toString());
  });

  it('returns Decimal zeros for a user with no wallets', async () => {
    const db = makeDb({ wallets: [] });
    const totals = await svc(db).getNetWorth({ userId: 'u1' });
    expect(totals.totalAset.toString()).toBe('0');
    expect(totals.totalUtang.toString()).toBe('0');
    expect(totals.netWorth.toString()).toBe('0');
    expect(totals.netWorth).toBeInstanceOf(Prisma.Decimal);
  });

  it('propagates a Prisma failure', async () => {
    const db = makeDb();
    db.wallet.findMany = vi.fn(async () => { throw new Error('boom'); });
    await expect(svc(db).getNetWorth({ userId: 'u1' })).rejects.toThrow('boom');
  });
});

// ────────────────────────────── getWalletSparkline ──────────────────────────────
const ownedWallet = (over: Record<string, unknown> = {}) => ({
  id: 'wallet-1', balance: D('100.25'), createdAt: new Date('2026-01-01T00:00:00Z'), ...over,
});

/** Serialize points the way the controller does, for concise value assertions. */
const values = (points: { balance: Prisma.Decimal | null }[]) =>
  points.map((p) => (p.balance === null ? null : Number(p.balance.toString())));

describe('walletQueryService.getWalletSparkline', () => {
  it('enforces ownership via findFirst({ id, userId }) and 404s an unowned wallet without querying transactions', async () => {
    const db = makeDb({ wallet: null });
    await expect(svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW }))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    await expect(svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW }))
      .rejects.toBeInstanceOf(WalletError);
    expect(firstArg(db.wallet.findFirst).where).toEqual({ id: 'wallet-1', userId: 'u1' });
    expect(db.transaction.findMany).not.toHaveBeenCalled();
  });

  it('returns exactly seven reporting-day points oldest-first, carrying forward on empty days', async () => {
    const db = makeDb({ wallet: ownedWallet(), tx: [] });
    const points = await svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW });
    expect(points).toHaveLength(7);
    expect(points.map((p) => p.date)).toEqual(LABELS);
    expect(values(points).every((v) => v === 100.25)).toBe(true);
  });

  it('queries both transfer sides with half-open bounds, stable ordering, and no row limit', async () => {
    const db = makeDb({ wallet: ownedWallet(), tx: [] });
    await svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW });
    const args = firstArg(db.transaction.findMany);
    expect(args.where.userId).toBe('u1');
    expect(args.where.OR).toEqual([{ walletId: 'wallet-1' }, { toWalletId: 'wallet-1' }]);
    expect(args.where.date.gte.toISOString()).toBe(WINDOW.gte);
    expect(args.where.date.lt.toISOString()).toBe(WINDOW.lt);
    expect(args.where.date.lte).toBeUndefined(); // half-open, never lte
    expect(args.orderBy).toEqual([{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.take).toBeUndefined(); // fetch every relevant row, never just 7
    expect(args.select.installment).toEqual({ select: { grandTotal: true } });
  });

  it('reconstructs income, expense, installment grandTotal, and transfer source/destination effects', async () => {
    const db = makeDb({
      wallet: ownedWallet(),
      tx: [
        { id: '4', type: 'TRANSFER', amount: D('5.05'), walletId: 'other', toWalletId: 'wallet-1', isInstallment: false, installment: null, date: new Date('2026-07-10T12:00:00Z'), createdAt: new Date('2026-07-10T12:00:00Z') },
        { id: '3', type: 'TRANSFER', amount: D('10.10'), walletId: 'wallet-1', toWalletId: 'other', isInstallment: false, installment: null, date: new Date('2026-07-09T12:00:00Z'), createdAt: new Date('2026-07-09T12:00:00Z') },
        { id: '2', type: 'EXPENSE', amount: D('2'), walletId: 'wallet-1', toWalletId: null, isInstallment: true, installment: { grandTotal: D('20.20') }, date: new Date('2026-07-08T12:00:00Z'), createdAt: new Date('2026-07-08T12:00:00Z') },
        { id: '1', type: 'INCOME', amount: D('1.01'), walletId: 'wallet-1', toWalletId: null, isInstallment: false, installment: null, date: new Date('2026-07-07T12:00:00Z'), createdAt: new Date('2026-07-07T12:00:00Z') },
      ],
    });
    const points = await svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW });
    expect(values(points)).toEqual([124.49, 124.49, 125.5, 105.3, 95.2, 100.25, 100.25]);
  });

  it('uses null for days before the wallet was created (never fabricates 0)', async () => {
    const db = makeDb({ wallet: ownedWallet({ balance: D('10'), createdAt: new Date('2026-07-09T01:00:00Z') }), tx: [] });
    const points = await svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW });
    expect(values(points).slice(0, 4)).toEqual([null, null, null, null]);
    expect(values(points)[4]).toBe(10);
  });

  it('excludes a future-dated effect from the realized close (reverses it out of the stored balance)', async () => {
    const db = makeDb({
      wallet: ownedWallet(),
      tx: [
        { id: 'future', type: 'EXPENSE', amount: D('25'), walletId: 'wallet-1', toWalletId: null, isInstallment: false, installment: null, date: new Date('2026-07-11T12:00:00Z'), createdAt: new Date('2026-07-11T09:00:00Z') },
      ],
    });
    const points = await svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW });
    expect(values(points)[6]).toBe(125.25); // 100.25 + reversed 25 future expense
  });

  it('applies a legacy transfer only on its known source side, warns, and never throws', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined as never);
    const db = makeDb({
      wallet: ownedWallet(),
      tx: [
        { id: 'legacy', type: 'TRANSFER', amount: D('7'), walletId: 'wallet-1', toWalletId: null, isInstallment: false, installment: null, date: new Date('2026-07-08T12:00:00Z'), createdAt: new Date('2026-07-08T12:00:00Z') },
      ],
    });
    const points = await svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW });
    // Source outflow of 7 undone walking back → earlier days 107.25, later days 100.25.
    expect(values(points)).toEqual([107.25, 107.25, 107.25, 100.25, 100.25, 100.25, 100.25]);
    expect(warn).toHaveBeenCalledWith(
      'wallet sparkline includes legacy transfer with unknown destination',
      { walletId: 'wallet-1' }
    );
    warn.mockRestore();
  });

  it('returns Decimal-or-null points (Decimals until the controller serializes)', async () => {
    const db = makeDb({ wallet: ownedWallet(), tx: [] });
    const points = await svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW });
    expect(points[6].balance).toBeInstanceOf(Prisma.Decimal);
    expect(points[6].balance!.toString()).toBe('100.25');
  });

  it('propagates a Prisma failure from the transaction query', async () => {
    const db = makeDb({ wallet: ownedWallet() });
    db.transaction.findMany = vi.fn(async () => { throw new Error('tx down'); });
    await expect(svc(db).getWalletSparkline({ userId: 'u1', walletId: 'wallet-1', now: NOW }))
      .rejects.toThrow('tx down');
  });
});
