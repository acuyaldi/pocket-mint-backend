import type { CreateWalletAliasInput, DeleteWalletAliasInput, WalletAlias, WalletAliasPrismaClient } from './walletAlias.types';
/**
 * True if any wallet the user owns — including the wallet the alias is
 * being attached to — has a canonical name that normalizes to the same
 * value. Computed on the fly (no stored `normalizedName` column) so a
 * pre-existing duplicate canonical name never gets a disruptive backfill
 * migration (see `financial-logic.skill.md`'s no-risky-cleanup guidance).
 */
declare function findCollidingWalletName(db: Pick<WalletAliasPrismaClient, 'wallet'>, userId: string, aliasNormalized: string): Promise<boolean>;
export declare function createWalletAliasService(db: WalletAliasPrismaClient): {
    create: (input: CreateWalletAliasInput) => Promise<WalletAlias>;
    remove: (input: DeleteWalletAliasInput) => Promise<void>;
};
/** Exposed for wallet.service.ts's reverse (name-vs-alias) collision check. */
export { findCollidingWalletName };
/** Production instance bound to the shared Prisma singleton. */
export declare const walletAliasService: {
    create: (input: CreateWalletAliasInput) => Promise<WalletAlias>;
    remove: (input: DeleteWalletAliasInput) => Promise<void>;
};
