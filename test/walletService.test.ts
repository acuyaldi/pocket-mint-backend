import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

// The service module builds a default instance from the shared Prisma singleton
// at import time. Stub that singleton so importing the module doesn't construct a
// real client — every test injects its own fake via createWalletService.
vi.mock('../src/lib/prisma', () => ({ default: {} }));

import { createWalletService } from '../src/services/wallet.service';
import { WalletError } from '../src/services/wallet.errors';
import type { WalletPrismaClient } from '../src/services/wallet.types';

const D = (n: number | string) => new Prisma.Decimal(n);

/**
 * Behavior-focused fake Prisma for the wallet command service. Every mutation is
 * a single write (no $transaction), so the fake just captures arguments and
 * returns deterministic records. `transaction.count` is driven per-test.
 */
function makeDb() {
  const db = {
    wallet: {
      create: vi.fn(async ({ data }: any) => ({ id: 'w-new', ...data })),
      findFirst: vi.fn(async () => null as any),
      update: vi.fn(async ({ where, data }: any) => ({ id: where.id, userId: 'u', ...data })),
      delete: vi.fn(async ({ where }: any) => ({ id: where.id, userId: 'u' })),
    },
    transaction: { count: vi.fn(async () => 0) },
  };
  return db;
}

const svc = (db: unknown) => createWalletService(db as WalletPrismaClient);

/** The `data` passed to the single create/update call. */
const createData = (db: ReturnType<typeof makeDb>) => db.wallet.create.mock.calls[0]?.[0].data;
const updateData = (db: ReturnType<typeof makeDb>) => db.wallet.update.mock.calls[0]?.[0].data;

// ────────────────────────────── CREATE ──────────────────────────────
describe('walletService.createWallet', () => {
  it('creates an asset wallet, defaulting type to CASH and seeding balances to 0', async () => {
    const db = makeDb();
    const wallet = await svc(db).createWallet({ userId: 'u', name: 'Cash' });
    expect(wallet).toMatchObject({ name: 'Cash', type: 'CASH' });
    expect(createData(db)).toMatchObject({ userId: 'u', name: 'Cash', type: 'CASH', balance: 0, initialBalance: 0 });
  });

  it('creates a credit card at zero balance with its billing metadata', async () => {
    const db = makeDb();
    await svc(db).createWallet({
      userId: 'u',
      name: 'CC',
      type: 'CREDIT_CARD',
      balance: -250_000,
      creditLimit: 1_000_000,
      cutoffDay: 20,
      paymentDueDay: 5,
    });
    expect(createData(db)).toMatchObject({
      type: 'CREDIT_CARD',
      balance: 0,
      initialBalance: 0,
      creditLimit: 1_000_000,
      cutoffDay: 20,
      paymentDueDay: 5,
    });
  });

  it('creates paylater with a positive limit and no opening outstanding', async () => {
    const db = makeDb();
    await svc(db).createWallet({
      userId: 'u',
      name: 'Paylater',
      type: 'PAYLATER',
      creditLimit: 500_000,
    });
    expect(createData(db)).toMatchObject({
      type: 'PAYLATER',
      balance: 0,
      initialBalance: 0,
      creditLimit: 500_000,
    });
  });

  it('creates a loan from one positive principal and stores negative liability', async () => {
    const db = makeDb();
    await svc(db).createWallet({ userId: 'u', name: 'Motor', type: 'LOAN', principal: 12_000_000 });
    expect(createData(db)).toMatchObject({
      type: 'LOAN',
      balance: -12_000_000,
      initialBalance: -12_000_000,
      creditLimit: 0,
      cutoffDay: null,
      paymentDueDay: null,
    });
  });

  it('copies the opening balance into initialBalance (Sprint 2A)', async () => {
    const db = makeDb();
    await svc(db).createWallet({ userId: 'u', name: 'Seed', balance: 500 });
    expect(createData(db)).toMatchObject({ balance: 500, initialBalance: 500 });
  });

  it('rejects an invalid wallet type before any write', async () => {
    const db = makeDb();
    await expect(svc(db).createWallet({ userId: 'u', name: 'X', type: 'CRYPTO' as any }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(db.wallet.create).not.toHaveBeenCalled();
  });

  it('rejects a malformed balance with a typed 400 before any write', async () => {
    const db = makeDb();
    await expect(svc(db).createWallet({ userId: 'u', name: 'X', balance: 'abc' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_AMOUNT' });
    expect(db.wallet.create).not.toHaveBeenCalled();
  });

  it('requires a positive creditLimit for credit products', async () => {
    const db = makeDb();
    await expect(svc(db).createWallet({ userId: 'u', name: 'Paylater', type: 'PAYLATER' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(db.wallet.create).not.toHaveBeenCalled();
  });

  it('requires a positive principal for a loan', async () => {
    const db = makeDb();
    await expect(svc(db).createWallet({ userId: 'u', name: 'Loan', type: 'LOAN', principal: 0 }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(db.wallet.create).not.toHaveBeenCalled();
  });

  it('rejects credit-only metadata for a loan', async () => {
    const db = makeDb();
    await expect(svc(db).createWallet({
      userId: 'u',
      name: 'Loan',
      type: 'LOAN',
      principal: 1_000_000,
      creditLimit: 2_000_000,
    })).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(db.wallet.create).not.toHaveBeenCalled();
  });

  it('rejects a negative opening balance for an asset wallet', async () => {
    const db = makeDb();
    await expect(svc(db).createWallet({ userId: 'u', name: 'Cash', type: 'CASH', balance: -1 }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(db.wallet.create).not.toHaveBeenCalled();
  });

  it('rejects billing days outside 1 through 31', async () => {
    const db = makeDb();
    await expect(svc(db).createWallet({
      userId: 'u',
      name: 'CC',
      type: 'CREDIT_CARD',
      creditLimit: 1_000_000,
      cutoffDay: 32,
    })).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(db.wallet.create).not.toHaveBeenCalled();
  });

  it('requires a name', async () => {
    const db = makeDb();
    await expect(svc(db).createWallet({ userId: 'u', name: '' }))
      .rejects.toMatchObject({ statusCode: 400, message: 'name is required and must be a string' });
    expect(db.wallet.create).not.toHaveBeenCalled();
  });

  it('maps a P2003 foreign-key violation to a 400 (user not found)', async () => {
    const db = makeDb();
    db.wallet.create = vi.fn(async () => { throw { code: 'P2003' }; });
    await expect(svc(db).createWallet({ userId: 'ghost', name: 'X' }))
      .rejects.toMatchObject({ statusCode: 400, message: 'Invalid userId (user not found)' });
  });

  it('propagates an unexpected Prisma failure untyped (reaches the central handler)', async () => {
    const db = makeDb();
    db.wallet.create = vi.fn(async () => { throw new Error('db exploded'); });
    const err = await svc(db).createWallet({ userId: 'u', name: 'X' }).catch((e) => e);
    expect(err).not.toBeInstanceOf(WalletError);
    expect(err.message).toBe('db exploded');
  });
});

// ────────────────────────────── UPDATE ──────────────────────────────
describe('walletService.updateWallet', () => {
  const owned = (balance = D(1000)) => vi.fn(async () => ({ id: 'w1', balance }));

  it('updates metadata without writing balance', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned();
    await svc(db).updateWallet({ userId: 'u', walletId: 'w1', name: 'New', color: '#000' });
    expect(updateData(db)).toEqual({ name: 'New', color: '#000' });
    expect(updateData(db)).not.toHaveProperty('balance');
  });

  it('updates credit metadata without writing ledger balance', async () => {
    const db = makeDb();
    db.wallet.findFirst = vi.fn(async () => ({ id: 'w1', type: 'CREDIT_CARD', balance: D(-1000) }));
    await svc(db).updateWallet({
      userId: 'u',
      walletId: 'w1',
      creditLimit: 2_000_000,
      cutoffDay: 18,
      paymentDueDay: 3,
    });
    expect(updateData(db)).toEqual({ creditLimit: 2_000_000, cutoffDay: 18, paymentDueDay: 3 });
    expect(updateData(db)).not.toHaveProperty('balance');
  });

  it('rejects a changed balance and writes nothing', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned(D(1000));
    await expect(svc(db).updateWallet({ userId: 'u', walletId: 'w1', balance: 5000 }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BALANCE_UPDATE_NOT_ALLOWED' });
    expect(db.wallet.update).not.toHaveBeenCalled();
  });

  it('tolerates an unchanged balance echo and still writes the other metadata', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned(D(1000));
    await svc(db).updateWallet({ userId: 'u', walletId: 'w1', name: 'Echo', balance: 1000 });
    expect(updateData(db)).toEqual({ name: 'Echo' });
  });

  it('rejects a malformed balance without writing', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned(D(1000));
    await expect(svc(db).updateWallet({ userId: 'u', walletId: 'w1', balance: 'nope' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_AMOUNT' });
    expect(db.wallet.update).not.toHaveBeenCalled();
  });

  it('never lets initialBalance or userId reach Prisma, and drops unknown fields', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned();
    await svc(db).updateWallet({ userId: 'u', walletId: 'w1', name: 'N', initialBalance: 999, bogus: 'x' } as any);
    const data = updateData(db);
    expect(data).toEqual({ name: 'N' });
    expect(data).not.toHaveProperty('initialBalance');
    expect(data).not.toHaveProperty('userId');
    expect(db.wallet.update.mock.calls[0][0].where).toEqual({ id: 'w1' });
  });

  it('preserves omitted vs explicit-null metadata', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned();
    await svc(db).updateWallet({ userId: 'u', walletId: 'w1', icon: null, color: null });
    expect(updateData(db)).toEqual({ icon: null, color: null });
  });

  it('rejects clearing a required credit limit', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned();
    await expect(svc(db).updateWallet({ userId: 'u', walletId: 'w1', creditLimit: null }))
      .rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    expect(db.wallet.update).not.toHaveBeenCalled();
  });

  it('404s for a wallet the caller does not own, without writing', async () => {
    const db = makeDb();
    db.wallet.findFirst = vi.fn(async () => null);
    await expect(svc(db).updateWallet({ userId: 'u', walletId: 'w1', name: 'X' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(db.wallet.update).not.toHaveBeenCalled();
  });

  it('maps a P2025 (row vanished mid-update) to a 404', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned();
    db.wallet.update = vi.fn(async () => { throw { code: 'P2025' }; });
    await expect(svc(db).updateWallet({ userId: 'u', walletId: 'w1', name: 'X' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ────────────────────────────── DELETE ──────────────────────────────
describe('walletService.deleteWallet', () => {
  const owned = vi.fn(async () => ({ id: 'w1' }));

  /**
   * transaction.count fake driven by a fixture of transfer rows. It evaluates the
   * real `where` the service builds, so the source-side / destination-side tests
   * genuinely exercise both `walletId` and `toWalletId` clauses of the OR.
   */
  const countFrom = (transfers: { walletId: string; toWalletId: string | null }[]) =>
    vi.fn(async ({ where }: any) => {
      if (where.type === 'TRANSFER' && where.OR) {
        return transfers.filter((r) =>
          where.OR.some(
            (c: any) =>
              (c.walletId !== undefined && r.walletId === c.walletId) ||
              (c.toWalletId !== undefined && r.toWalletId === c.toWalletId)
          )
        ).length;
      }
      return 0; // plain-history query
    });

  it('deletes an empty wallet', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned;
    const res = await svc(db).deleteWallet({ userId: 'u', walletId: 'w1' });
    expect(res).toEqual({ id: 'w1' });
    expect(db.wallet.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
  });

  it('refuses a wallet with plain history when force is not set', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned;
    db.transaction.count = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(5);
    await expect(svc(db).deleteWallet({ userId: 'u', walletId: 'w1', force: false }))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(db.wallet.delete).not.toHaveBeenCalled();
  });

  it('force-deletes a wallet whose only history is income/expense', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned;
    db.transaction.count = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(5);
    await svc(db).deleteWallet({ userId: 'u', walletId: 'w1', force: true });
    expect(db.wallet.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
  });

  it('blocks deletion when the wallet is the SOURCE of a transfer, even with force', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned;
    db.transaction.count = countFrom([{ walletId: 'w1', toWalletId: 'other' }]);
    await expect(svc(db).deleteWallet({ userId: 'u', walletId: 'w1', force: true }))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(db.wallet.delete).not.toHaveBeenCalled();
  });

  it('blocks deletion when the wallet is the DESTINATION of a transfer, even with force', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned;
    db.transaction.count = countFrom([{ walletId: 'other', toWalletId: 'w1' }]);
    await expect(svc(db).deleteWallet({ userId: 'u', walletId: 'w1', force: true }))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(db.wallet.delete).not.toHaveBeenCalled();
  });

  it('still blocks a legacy transfer (null destination) via its source side', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned;
    db.transaction.count = countFrom([{ walletId: 'w1', toWalletId: null }]);
    await expect(svc(db).deleteWallet({ userId: 'u', walletId: 'w1', force: true }))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(db.wallet.delete).not.toHaveBeenCalled();
  });

  it('404s for a wallet the caller does not own, without counting transactions', async () => {
    const db = makeDb();
    db.wallet.findFirst = vi.fn(async () => null);
    await expect(svc(db).deleteWallet({ userId: 'u', walletId: 'w1' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(db.transaction.count).not.toHaveBeenCalled();
  });

  it('maps a P2025 (row vanished mid-delete) to a 404', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned;
    db.wallet.delete = vi.fn(async () => { throw { code: 'P2025' }; });
    await expect(svc(db).deleteWallet({ userId: 'u', walletId: 'w1' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('propagates an unexpected delete failure untyped', async () => {
    const db = makeDb();
    db.wallet.findFirst = owned;
    db.wallet.delete = vi.fn(async () => { throw new Error('boom'); });
    const err = await svc(db).deleteWallet({ userId: 'u', walletId: 'w1' }).catch((e) => e);
    expect(err).not.toBeInstanceOf(WalletError);
    expect(err.message).toBe('boom');
  });
});
