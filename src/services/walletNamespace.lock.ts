// ============================================================
// User-scoped advisory lock for the wallet naming namespace (Phase 37)
// ------------------------------------------------------------
// A wallet's canonical name and its explicit aliases (WalletAlias) live in
// two different tables, so no single DB constraint can stop a concurrent
// "create wallet named X" and "create alias X" from both passing their
// pre-write collision checks before either writes. This transaction-scoped
// Postgres advisory lock, keyed on the caller's userId, serializes every
// namespace-mutating write (wallet create/rename, alias create/delete) for
// that user so the checks-then-write sequence in wallet.service.ts and
// walletAlias.service.ts is race-free.
//
// Mirrors financial-draft.service.ts's `pg_advisory_xact_lock(hashtextextended(draftId, 0))`
// — same mechanism, second hashtextextended argument changed to 1 so this
// lock domain can never collide with the draft-confirmation lock domain
// even if a userId string happened to equal some draftId string.
// ============================================================

import { Prisma } from '../generated/prisma/client';

const WALLET_NAMESPACE_LOCK_SALT = 1;

export async function lockWalletNamespace(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$queryRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, ${WALLET_NAMESPACE_LOCK_SALT}))::text AS "lock"`
  );
}
