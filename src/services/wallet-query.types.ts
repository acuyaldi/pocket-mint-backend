// ============================================================
// Wallet query service contracts (input/output/dependency types)
// ------------------------------------------------------------
// The read counterpart to wallet.types.ts. Explicit, Express-free inputs and
// outputs for the wallet *query* service (listing, net-worth snapshot, and the
// seven-day sparkline). The controller maps HTTP requests into these and
// serializes the typed results (Decimals intact) back out. No `any`, no raw
// request objects, and a narrow Prisma dependency so tests can inject a fake
// without a DI framework or a repository layer.
//
// Scope: reads only. Wallet mutations live in wallet.types.ts / wallet.service.ts
// (Sprint 3C); no write surface is modeled here.
// ============================================================

import type { PrismaClient, Prisma, Wallet } from '../generated/prisma/client';

export type { Wallet };

/**
 * The slice of the Prisma client the query service needs: read access to the
 * `wallet` model (`findMany` for listing/net-worth, `findFirst` for the
 * sparkline ownership check) and the `transaction` model (`findMany` for the
 * sparkline reconstruction). Ownership is enforced by scoping every query on
 * `userId`, so no write methods are required or exposed.
 */
export type WalletQueryPrismaClient = Pick<PrismaClient, 'wallet' | 'transaction'>;

/** List every wallet the authenticated caller owns. `userId` is never taken from the client. */
export interface ListWalletsInput {
  userId: string;
}

/** Net-worth snapshot scoped to the authenticated caller. */
export interface GetNetWorthInput {
  userId: string;
}

/**
 * Seven-day sparkline for one owned wallet. `now` is an optional test clock so the
 * rolling reporting-day window is deterministic in tests; production passes none
 * and the service uses the real current instant.
 */
export interface GetWalletSparklineInput {
  userId: string;
  walletId: string;
  now?: Date;
}

/**
 * Net-worth totals carrying exact `Decimal` values (serialization to numbers is
 * the controller's job — one clear boundary). Product rule (unchanged): assets =
 * CASH/BANK/E_WALLET balances; debt = |CREDIT_CARD/LOAN_PAYLATER balances|;
 * `netWorth` is the asset total only (debt is reported separately, not subtracted).
 */
export interface WalletTotals {
  totalAset: Prisma.Decimal;
  totalUtang: Prisma.Decimal;
  netWorth: Prisma.Decimal;
}

/**
 * One reconstructed sparkline point: the reporting-local calendar date label and
 * the wallet's end-of-day closing balance as a `Decimal`, or `null` for a day
 * before the wallet existed. The controller serializes `balance` to `number | null`.
 */
export interface WalletSparklinePoint {
  date: string;
  balance: Prisma.Decimal | null;
}
