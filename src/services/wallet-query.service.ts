// ============================================================
// Wallet query service
// ------------------------------------------------------------
// The read counterpart to wallet.service.ts. Owns ownership-scoped wallet reads:
// the wallet listing, the net-worth snapshot, and (below) the seven-day
// sparkline. It has no Express dependency and writes no HTTP responses: it
// returns typed domain records (raw Prisma wallets / Decimal totals) or throws
// typed WalletErrors. It performs NO mutations and opens NO write transactions.
//
// The service *orchestrates*; the pure calculations stay in their domain modules:
// net-worth aggregation is `calculateNetWorth` (utils/financial), reporting-day
// windows come from `getRollingDayRanges` and per-transaction effects from
// `getWalletReportingEffect` (domain/*). Nothing here reimplements them, and no
// server-local calendar arithmetic is used — the reporting timezone is fixed.
//
// Dependency injection mirrors the other services: a narrow read Prisma `Pick` is
// passed to the factory; the default `walletQueryService` binds the shared
// singleton for production.
// ============================================================

import prisma from '../lib/prisma';
import { calculateNetWorth } from '../utils/financial';
import type {
  GetNetWorthInput,
  ListWalletsInput,
  Wallet,
  WalletQueryPrismaClient,
  WalletTotals,
} from './wallet-query.types';

export function createWalletQueryService(db: WalletQueryPrismaClient) {
  /**
   * List every wallet the caller owns, ordered by creation (oldest first) —
   * ownership-scoped so cross-user wallets are impossible. Returns the raw Prisma
   * wallets with Decimal fields intact; the controller serializes them (parseFloat
   * plus the DEBT-only `sisa_limit`/`outstanding_debt` computed fields). Archived
   * wallets are included exactly as before (no `isArchived` filter).
   */
  async function listWallets(input: ListWalletsInput): Promise<Wallet[]> {
    return db.wallet.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Net-worth snapshot for the caller, ownership-scoped. Delegates the arithmetic
   * to the shared Decimal-safe `calculateNetWorth` helper (no float summation
   * here), preserving the product rule exactly: `totalAset` = asset balances,
   * `totalUtang` = |debt balances|, `netWorth` = asset total only (debt reported
   * separately, never subtracted). Returns Decimals; the controller serializes.
   */
  async function getNetWorth(input: GetNetWorthInput): Promise<WalletTotals> {
    const wallets = await db.wallet.findMany({
      where: { userId: input.userId },
      select: { type: true, balance: true },
    });
    return calculateNetWorth(wallets);
  }

  return { listWallets, getNetWorth };
}

/** Production instance bound to the shared Prisma singleton. */
export const walletQueryService = createWalletQueryService(prisma);
