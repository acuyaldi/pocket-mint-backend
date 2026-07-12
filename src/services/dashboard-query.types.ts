// ============================================================
// Dashboard query service contracts (input/output/dependency types)
// ------------------------------------------------------------
// Explicit, Express-free inputs and outputs for the dashboard *query* service.
// The dashboard is read-only, so there is no command counterpart. The controller
// maps the authenticated request into these and serializes the typed Decimal
// result back out (one clear boundary). No `any`, no raw request objects, and a
// narrow Prisma dependency (reads only) so tests can inject a fake without a DI
// framework or a repository layer.
//
// Scope note: the live endpoint is exactly `GET /dashboard/summary`, which
// reports the caller's net-worth totals. There are no month/year query params,
// no income/expense/trend fields, and no installment or recent-transaction data
// on this endpoint today — so none are modeled here (inventing them would break
// the "ground everything in real code" rule).
// ============================================================

import type { PrismaClient, Prisma } from '../generated/prisma/client';

/**
 * The slice of the Prisma client the query service needs: read access to the
 * `wallet` model only (`findMany` for the net-worth totals). Ownership is
 * enforced by scoping every query on `userId`, so no write surface — and no other
 * model — is required or exposed.
 */
export type DashboardQueryPrismaClient = Pick<PrismaClient, 'wallet'>;

/**
 * Input for the dashboard summary (`GET /dashboard/summary`). `userId` is the
 * authenticated caller, injected by `requireUser` — never taken from the query
 * string or body. The endpoint accepts no other parameters today.
 */
export interface GetDashboardSummaryInput {
  userId: string;
}

/**
 * Dashboard summary carrying exact `Decimal` values. Serialization to numbers is
 * the controller's job (the single response boundary); the service never calls
 * `.toNumber()` / `parseFloat`. Product rule (unchanged, delegated to
 * `calculateNetWorth`): `totalAset` = CASH/BANK/E_WALLET balances; `totalUtang` =
 * |CREDIT_CARD/LOAN_PAYLATER balances|; `netWorth` is the asset total only (debt
 * is reported separately in `totalUtang`, never subtracted). Structurally
 * identical to the wallet query service's `WalletTotals`, kept as its own type so
 * the dashboard contract is self-contained.
 */
export interface DashboardSummaryResult {
  totalAset: Prisma.Decimal;
  totalUtang: Prisma.Decimal;
  netWorth: Prisma.Decimal;
}
