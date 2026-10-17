// ============================================================
// Wallet alias command service (Phase 37, PD-027)
// ------------------------------------------------------------
// Owns WalletAlias CRUD business rules: normalization (reusing the
// Assistant entity-resolution normalizer exactly — no second normalizer),
// ownership checks, and the per-user alias/canonical-name namespace
// guarantee. No Express dependency; returns the raw persisted WalletAlias
// or throws a typed WalletAliasError. Mirrors merchantMapping.service.ts's
// shape, with an added user-scoped advisory lock (walletNamespace.lock.ts)
// around the create path because the namespace it protects spans two
// tables (Wallet.name and WalletAlias.aliasNormalized) that no single DB
// constraint can cover.
//
// There is deliberately no update() — delete and recreate is the intended
// alias-editing flow (see docs/product/decisions/027-wallet-alias-management.md).
// ============================================================

import prisma from '../lib/prisma';
import { ENTITY_RESOLUTION_LIMITS, normalizeEntityReference } from '../assistant/entity-resolution';
import { lockWalletNamespace } from './walletNamespace.lock';
import { WalletAliasError } from './walletAlias.errors';
import type {
  CreateWalletAliasInput,
  DeleteWalletAliasInput,
  WalletAlias,
  WalletAliasPrismaClient,
} from './walletAlias.types';

/**
 * Bounded so a wallet's explicit aliases can never crowd out its
 * name-derived tokens (`aliasesFromTrustedWalletName` in wallet-resolver.ts)
 * past `ENTITY_RESOLUTION_LIMITS.aliasesPerCandidate` (16) once both are
 * merged for resolution — see wallet-resolver.ts's `combineAliasSources`.
 * 10 leaves headroom for any realistic wallet name's derived word count.
 */
const MAX_ALIASES_PER_WALLET = 10;

/** Trim, size-check, and normalize a candidate alias display string. */
function parseAliasDisplay(value: string | undefined | null): { aliasDisplay: string; aliasNormalized: string } {
  const aliasDisplay = typeof value === 'string' ? value.trim() : '';
  if (aliasDisplay.length === 0) {
    throw new WalletAliasError('aliasDisplay is required', 400, 'BAD_REQUEST');
  }
  // Must fit the same per-alias byte budget the resolver enforces on every
  // candidate alias (`createEntityCandidate`) — otherwise a stored alias
  // that passes creation would make resolution itself throw later.
  if (Buffer.byteLength(aliasDisplay, 'utf8') > ENTITY_RESOLUTION_LIMITS.aliasBytes) {
    throw new WalletAliasError(
      `aliasDisplay must be at most ${ENTITY_RESOLUTION_LIMITS.aliasBytes} bytes`,
      400,
      'BAD_REQUEST'
    );
  }
  const normalized = normalizeEntityReference(aliasDisplay);
  if (!normalized.ok) {
    throw new WalletAliasError('aliasDisplay must normalize to a non-empty value', 422, 'INVALID_ALIAS');
  }
  return { aliasDisplay, aliasNormalized: normalized.normalized };
}

/**
 * True if any wallet the user owns — including the wallet the alias is
 * being attached to — has a canonical name that normalizes to the same
 * value. Computed on the fly (no stored `normalizedName` column) so a
 * pre-existing duplicate canonical name never gets a disruptive backfill
 * migration (see `financial-logic.skill.md`'s no-risky-cleanup guidance).
 */
async function findCollidingWalletName(
  db: Pick<WalletAliasPrismaClient, 'wallet'>,
  userId: string,
  aliasNormalized: string
): Promise<boolean> {
  const wallets = await db.wallet.findMany({ where: { userId }, select: { name: true } });
  return wallets.some((wallet) => {
    const normalized = normalizeEntityReference(wallet.name);
    return normalized.ok && normalized.normalized === aliasNormalized;
  });
}

export function createWalletAliasService(db: WalletAliasPrismaClient) {
  /**
   * Create an explicit alias for an owned wallet. Runs inside a
   * user-scoped advisory-locked transaction so a concurrent wallet
   * create/rename (`wallet.service.ts`) cannot slip a colliding canonical
   * name past this alias's own collision check, or vice versa. The
   * `@@unique([userId, aliasNormalized])` constraint remains the final
   * guarantee — a losing concurrent insert still surfaces as the same
   * typed conflict via the P2002 handler below.
   */
  async function create(input: CreateWalletAliasInput): Promise<WalletAlias> {
    const { userId, walletId } = input;
    const { aliasDisplay, aliasNormalized } = parseAliasDisplay(input.aliasDisplay);

    return db.$transaction(async (tx) => {
      await lockWalletNamespace(tx, userId);

      const wallet = await tx.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } });
      if (!wallet) {
        throw new WalletAliasError(`Wallet with id ${walletId} not found`, 404, 'NOT_FOUND');
      }

      const aliasCount = await tx.walletAlias.count({ where: { walletId } });
      if (aliasCount >= MAX_ALIASES_PER_WALLET) {
        throw new WalletAliasError(
          `A wallet can have at most ${MAX_ALIASES_PER_WALLET} aliases`,
          409,
          'ALIAS_LIMIT_REACHED'
        );
      }

      if (await findCollidingWalletName(tx, userId, aliasNormalized)) {
        throw new WalletAliasError('This name is already used as a wallet name', 409, 'CONFLICT');
      }
      const existingAlias = await tx.walletAlias.findFirst({ where: { userId, aliasNormalized } });
      if (existingAlias) {
        throw new WalletAliasError('This alias is already in use', 409, 'CONFLICT');
      }

      try {
        return await tx.walletAlias.create({ data: { walletId, userId, aliasDisplay, aliasNormalized } });
      } catch (err) {
        if (err instanceof WalletAliasError) throw err;
        if ((err as { code?: string }).code === 'P2002') {
          throw new WalletAliasError('This alias is already in use', 409, 'CONFLICT');
        }
        throw err;
      }
    });
  }

  /**
   * Delete an owned alias. Ownership is scoped by `(id, walletId, userId)`
   * in one lookup, so a wrong wallet or a cross-user alias id is one
   * indistinguishable 404 — no separate "wrong wallet" vs "not yours"
   * signal. A single delete needs no transaction/lock: it removes a row
   * rather than racing a collision check.
   *
   * The findFirst-then-delete pair is still a TOCTOU window: a concurrent or
   * retried delete of the same alias can pass the findFirst check and then
   * hit Prisma P2025 on the delete itself (the row is already gone). That is
   * translated into the same typed 404 the pre-check already throws —
   * mirroring wallet.service.ts's existing P2025 handling for deleteWallet/
   * updateWallet — instead of propagating a raw Prisma error as an
   * unexpected 500.
   */
  async function remove(input: DeleteWalletAliasInput): Promise<void> {
    const { userId, walletId, aliasId } = input;
    const existing = await db.walletAlias.findFirst({
      where: { id: aliasId, walletId, userId },
      select: { id: true },
    });
    if (!existing) {
      throw new WalletAliasError(`Alias with id ${aliasId} not found`, 404, 'NOT_FOUND');
    }
    try {
      await db.walletAlias.delete({ where: { id: aliasId } });
    } catch (err) {
      if (err instanceof WalletAliasError) throw err;
      if ((err as { code?: string }).code === 'P2025') {
        throw new WalletAliasError(`Alias with id ${aliasId} not found`, 404, 'NOT_FOUND');
      }
      throw err;
    }
  }

  return { create, remove };
}

/** Exposed for wallet.service.ts's reverse (name-vs-alias) collision check. */
export { findCollidingWalletName };

/** Production instance bound to the shared Prisma singleton. */
export const walletAliasService = createWalletAliasService(prisma);
