import type { PrismaClient, Prisma } from '../generated/prisma/client';
import type { TransactionType } from '../models/transaction.model';
import { TRANSACTION_INCLUDE, type TransactionWithRelations } from './transaction.types';
/**
 * The slice of the Prisma client the query service needs: read-only access to
 * the `transaction` model (`findMany` for listing, `groupBy` for the summary).
 * Ownership is enforced by scoping every query on `userId`, so no wallet/category
 * lookups — and therefore no write surface — are required here.
 */
export type TransactionQueryPrismaClient = Pick<PrismaClient, 'transaction'>;
/**
 * Input for the transaction listing (`GET /transactions` and
 * `GET /transactions/all`). Numeric filters are already parsed by the controller;
 * lenient clamp/default normalization (to match the existing API exactly) happens
 * inside the service. `userId` is the authenticated caller — never taken from the
 * query string.
 */
export interface ListTransactionsInput {
    userId: string;
    walletId?: string;
    type?: TransactionType;
    /** 1–12; omitted → current reporting month. Ignored when `allTime` is true. */
    month?: number;
    /** e.g. 2026; omitted → current reporting year. Ignored when `allTime` is true. */
    year?: number;
    /** Result cap, clamped to 0–200 (0/absent → no cap, as today). */
    limit?: number;
    /** True for the `/all` endpoint: skip the month/year date filter entirely. */
    allTime?: boolean;
    /**
     * Explicit half-open date range (e.g. for the transaction export). When set,
     * this replaces the month/year/allTime resolution entirely — `startDate` maps
     * to `date >= startDate`, `endDate` to `date < endDate`.
     */
    startDate?: Date;
    endDate?: Date;
}
/** Input for the monthly summary (`GET /transactions/summary`). */
export interface TransactionSummaryInput {
    userId: string;
    /** 1–12; omitted → current reporting month. */
    month?: number;
    /** e.g. 2026; omitted → current reporting year. */
    year?: number;
}
/**
 * Summary result carrying exact `Decimal` values. Serialization to numbers is the
 * controller's job (one clear boundary); the service never calls `.toNumber()`.
 */
export interface TransactionSummaryResult {
    income: Prisma.Decimal;
    expenses: Prisma.Decimal;
    netSavings: Prisma.Decimal;
    /** Canonical `YYYY-MM` label for the reporting month that was summarized. */
    month: string;
}
export { TRANSACTION_INCLUDE };
export type { TransactionWithRelations };
//# sourceMappingURL=transaction-query.types.d.ts.map