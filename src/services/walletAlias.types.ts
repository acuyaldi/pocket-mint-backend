// ============================================================
// Wallet alias service contracts (Phase 37)
// ------------------------------------------------------------
// Explicit, Express-free types for the wallet alias command service. The
// controller maps HTTP requests into these; the service returns the raw
// persisted WalletAlias record or throws a typed WalletAliasError.
// ============================================================

import type { PrismaClient, WalletAlias } from '../generated/prisma/client';

export type { WalletAlias };

/**
 * The slice of the Prisma client the alias service needs: `wallet` (to
 * verify ownership of the target wallet and to check canonical-name
 * collisions across the caller's wallets), `walletAlias` (the resource
 * itself), and `$transaction` (the user-scoped advisory lock boundary from
 * `walletNamespace.lock.ts`).
 */
export type WalletAliasPrismaClient = Pick<PrismaClient, 'wallet' | 'walletAlias' | '$transaction'>;

export interface CreateWalletAliasInput {
  userId: string;
  walletId: string;
  aliasDisplay: string;
}

export interface DeleteWalletAliasInput {
  userId: string;
  walletId: string;
  aliasId: string;
}

export interface ListWalletAliasesInput {
  userId: string;
  walletId: string;
}
