import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ default: {} }));

import { createWalletAliasService } from '../../src/services/walletAlias.service';
import { WalletAliasError } from '../../src/services/walletAlias.errors';

const USER = 'user-1';
const OTHER_USER = 'user-2';

function makeAlias(over: Record<string, unknown> = {}) {
  return {
    id: 'alias-1',
    walletId: 'wallet-1',
    userId: USER,
    aliasDisplay: 'rekening utama',
    aliasNormalized: 'rekening utama',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    ...over,
  };
}

/**
 * Behavior-focused fake Prisma. `create()` opens a user-scoped advisory-locked
 * `$transaction`; the fake just runs the callback against this same `db` so
 * every `tx.*` call resolves to the identical mocks below.
 */
function makeDb(over: {
  walletFindFirst?: unknown;
  walletFindMany?: unknown[];
  aliasFindFirst?: unknown;
  aliasCount?: number;
  aliasCreate?: (args: unknown) => unknown;
} = {}) {
  const db: any = {
    wallet: {
      findFirst: vi.fn(async () => (over.walletFindFirst === undefined ? { id: 'wallet-1' } : over.walletFindFirst)),
      findMany: vi.fn(async () => over.walletFindMany ?? []),
    },
    walletAlias: {
      findFirst: vi.fn(async () => over.aliasFindFirst ?? null),
      count: vi.fn(async () => over.aliasCount ?? 0),
      create: vi.fn(async (args: any) =>
        over.aliasCreate ? over.aliasCreate(args) : { id: 'alias-new', createdAt: new Date('2026-07-01T00:00:00.000Z'), ...args.data }
      ),
      delete: vi.fn(async () => makeAlias()),
    },
    $queryRaw: vi.fn(async () => undefined),
  };
  db.$transaction = vi.fn(async (fn: (tx: typeof db) => unknown) => fn(db));
  return db;
}

describe('wallet alias service — create', () => {
  it('normalizes the alias and creates it under the user-scoped lock', async () => {
    const db = makeDb();
    const service = createWalletAliasService(db as any);

    const created = await service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: '  Rekening Utama  ' });

    expect(db.$queryRaw).toHaveBeenCalledOnce(); // the advisory lock
    expect(db.walletAlias.create).toHaveBeenCalledWith({
      data: { walletId: 'wallet-1', userId: USER, aliasDisplay: 'Rekening Utama', aliasNormalized: 'rekening utama' },
    });
    expect(created.aliasNormalized).toBe('rekening utama');
  });

  it('rejects an empty aliasDisplay', async () => {
    const db = makeDb();
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: '   ' }))
      .rejects.toMatchObject({ code: 'BAD_REQUEST', statusCode: 400 });
    expect(db.walletAlias.create).not.toHaveBeenCalled();
  });

  it('rejects an aliasDisplay that normalizes to nothing', async () => {
    const db = makeDb();
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: '###' }))
      .rejects.toMatchObject({ code: 'INVALID_ALIAS', statusCode: 422 });
    expect(db.walletAlias.create).not.toHaveBeenCalled();
  });

  it('rejects an aliasDisplay over the shared per-alias byte budget', async () => {
    const db = makeDb();
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: 'x'.repeat(129) }))
      .rejects.toMatchObject({ code: 'BAD_REQUEST', statusCode: 400 });
    expect(db.walletAlias.create).not.toHaveBeenCalled();
  });

  it('404s for a wallet not owned by the caller, indistinguishable from missing', async () => {
    const db = makeDb({ walletFindFirst: null });
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: OTHER_USER, walletId: 'wallet-1', aliasDisplay: 'Nickname' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    expect(db.walletAlias.create).not.toHaveBeenCalled();
  });

  it('rejects once the per-wallet alias cap is reached', async () => {
    const db = makeDb({ aliasCount: 10 });
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: 'Nickname' }))
      .rejects.toMatchObject({ code: 'ALIAS_LIMIT_REACHED', statusCode: 409 });
    expect(db.walletAlias.create).not.toHaveBeenCalled();
  });

  it('rejects an alias colliding with any canonical wallet name owned by the same user', async () => {
    const db = makeDb({ walletFindMany: [{ name: 'BCA Debit' }, { name: 'Rekening Utama' }] });
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: 'rekening utama' }))
      .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    expect(db.walletAlias.create).not.toHaveBeenCalled();
  });

  it("rejects an alias colliding with its own wallet's canonical normalized name", async () => {
    const db = makeDb({ walletFindMany: [{ name: 'BCA-Debit' }] });
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: 'bca debit' }))
      .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
  });

  it('rejects an alias already used by this user (same or another wallet)', async () => {
    const db = makeDb({ aliasFindFirst: makeAlias({ walletId: 'wallet-2' }) });
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: 'Rekening Utama' }))
      .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    expect(db.walletAlias.create).not.toHaveBeenCalled();
  });

  it('translates a raw P2002 race (concurrent insert) into the same typed conflict', async () => {
    const db = makeDb({
      aliasCreate: () => {
        throw Object.assign(new Error('unique violation'), { code: 'P2002' });
      },
    });
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: 'Rekening Utama' }))
      .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
  });
});

describe('wallet alias service — delete', () => {
  it('deletes an alias owned by the caller, scoped by (id, walletId, userId)', async () => {
    const db = makeDb({ aliasFindFirst: makeAlias() });
    const service = createWalletAliasService(db as any);
    await service.remove({ userId: USER, walletId: 'wallet-1', aliasId: 'alias-1' });
    expect(db.walletAlias.findFirst).toHaveBeenCalledWith({
      where: { id: 'alias-1', walletId: 'wallet-1', userId: USER },
      select: { id: true },
    });
    expect(db.walletAlias.delete).toHaveBeenCalledWith({ where: { id: 'alias-1' } });
  });

  it("404s for another user's alias, indistinguishable from missing", async () => {
    const db = makeDb({ aliasFindFirst: null });
    const service = createWalletAliasService(db as any);
    await expect(service.remove({ userId: OTHER_USER, walletId: 'wallet-1', aliasId: 'alias-1' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    expect(db.walletAlias.delete).not.toHaveBeenCalled();
  });

  it('404s when the alias belongs to a different wallet than named in the route', async () => {
    const db = makeDb({ aliasFindFirst: null });
    const service = createWalletAliasService(db as any);
    await expect(service.remove({ userId: USER, walletId: 'wallet-wrong', aliasId: 'alias-1' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('translates a P2025 race on the delete itself (already deleted by a concurrent/retried call) into the same typed 404', async () => {
    const db = makeDb({ aliasFindFirst: makeAlias() });
    db.walletAlias.delete = vi.fn(async () => {
      throw Object.assign(new Error('record not found'), { code: 'P2025' });
    });
    const service = createWalletAliasService(db as any);
    await expect(service.remove({ userId: USER, walletId: 'wallet-1', aliasId: 'alias-1' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    await expect(service.remove({ userId: USER, walletId: 'wallet-1', aliasId: 'alias-1' }))
      .rejects.toBeInstanceOf(WalletAliasError);
  });

  it('propagates an unexpected delete failure untyped (never masked as NOT_FOUND)', async () => {
    const db = makeDb({ aliasFindFirst: makeAlias() });
    db.walletAlias.delete = vi.fn(async () => {
      throw new Error('db exploded');
    });
    const service = createWalletAliasService(db as any);
    const err = await service.remove({ userId: USER, walletId: 'wallet-1', aliasId: 'alias-1' }).catch((e) => e);
    expect(err).not.toBeInstanceOf(WalletAliasError);
    expect(err.message).toBe('db exploded');
  });
});

describe('wallet alias service — archived-wallet namespace policy (current behavior, unchanged by this patch)', () => {
  it('queries canonical names for collision checking without filtering out archived wallets', async () => {
    // A real isArchived: false filter here would exclude archived wallets from
    // the collision check — this pins the current, intentionally unfiltered
    // query shape (see walletAlias.service.ts's findCollidingWalletName) so a
    // future change to it is a deliberate decision, not a silent regression.
    // The actual end-to-end behavior against a real archived row is proven in
    // walletAlias.integration.test.ts.
    const db = makeDb({ walletFindMany: [{ name: 'Old BCA' }] });
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: 'old bca' }))
      .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    expect(db.wallet.findMany).toHaveBeenCalledWith({ where: { userId: USER }, select: { name: true } });
    expect(db.walletAlias.create).not.toHaveBeenCalled();
  });

  it("an existing alias still blocks a new one with the same normalized text regardless of its wallet's archived state", async () => {
    // walletAlias has no isArchived concept of its own, and the collision
    // query below is scoped by (userId, aliasNormalized) only — it never
    // joins wallet.isArchived, so an alias belonging to an archived wallet
    // remains fully reserved.
    const db = makeDb({ aliasFindFirst: makeAlias({ walletId: 'archived-wallet' }) });
    const service = createWalletAliasService(db as any);
    await expect(service.create({ userId: USER, walletId: 'wallet-1', aliasDisplay: 'Rekening Utama' }))
      .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    expect(db.walletAlias.findFirst).toHaveBeenCalledWith({ where: { userId: USER, aliasNormalized: 'rekening utama' } });
  });
});

describe('wallet alias service — error shape', () => {
  it('WalletAliasError carries isOperational for the central error handler', () => {
    const err = new WalletAliasError('x', 409, 'CONFLICT');
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(WalletAliasError);
  });
});
