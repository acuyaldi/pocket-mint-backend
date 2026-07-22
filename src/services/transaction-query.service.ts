// ============================================================
// Transaction query service
// ------------------------------------------------------------
// The read counterpart to transaction.service.ts. Owns ownership-scoped reads,
// filter normalization, reporting-period orchestration, and Decimal-exact
// aggregates for the transaction list and monthly summary. It has no Express
// dependency and writes no HTTP responses: it returns typed domain records
// (Decimals intact) or throws typed TransactionErrors. It performs NO mutations
// and opens NO write transactions.
//
// Reporting boundaries come from the existing Sprint 2C reporting utilities
// (`formatReportingDate` + `getReportingMonthRange`), never from server-local
// Date math. Normalization deliberately reproduces the controller's prior
// lenient clamp/default semantics so the public API is byte-for-byte unchanged.
//
// Dependency injection mirrors the mutation service: a narrow read-only Prisma
// Pick is passed to the factory; the default `transactionQueryService` binds the
// shared singleton for production.
// ============================================================

import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { reportingConfig } from '../config';
import { formatReportingDate, getReportingMonthRange, type ReportingRange } from '../domain/reportingTime';
import { TransactionError } from './transaction.errors';
import {
  TRANSACTION_INCLUDE,
  type ListTransactionsInput,
  type TransactionQueryPrismaClient,
  type TransactionSummaryInput,
  type TransactionSummaryResult,
  type TransactionWithRelations,
} from './transaction-query.types';

const VALID_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'];
const MAX_LIMIT = 200;

/** The current calendar month in the reporting timezone (never server-local). */
function currentReportingMonth(): { month: number; year: number } {
  const [year, month] = formatReportingDate(new Date(), reportingConfig.timezone).split('-').map(Number);
  return { year, month };
}

/**
 * Resolve an effective (month, year), reproducing the controller's prior
 * behavior exactly: an omitted value falls back to the current reporting month;
 * a provided month is clamped to 1–12 (with 0/NaN treated as "use current"); a
 * provided year uses its value unless it is 0/NaN.
 */
function resolveMonthYear(month?: number, year?: number): { month: number; year: number } {
  const current = currentReportingMonth();
  const m = month === undefined ? current.month : Math.min(Math.max(month || current.month, 1), 12);
  const y = year === undefined ? current.year : year || current.year;
  return { month: m, year: y };
}

/** Resolve the half-open reporting month range plus the labels used in responses. */
function resolveMonthRange(month?: number, year?: number): { range: ReportingRange; month: number; year: number } {
  const { month: m, year: y } = resolveMonthYear(month, year);
  return { range: getReportingMonthRange({ month: m, year: y }, reportingConfig.timezone), month: m, year: y };
}

/**
 * Clamp a requested limit to a safe cap, matching the prior controller: values
 * ≤ 0 (or absent) mean "no cap", anything above MAX_LIMIT is capped.
 */
function resolveTake(limit?: number): number | undefined {
  if (limit === undefined) return undefined;
  const take = Math.min(Math.max(limit || 0, 0), MAX_LIMIT);
  return take > 0 ? take : undefined;
}

/** Reject an unsupported transaction-type filter with the same 400 the controller returned. */
function assertValidType(type?: string): void {
  if (type && !VALID_TYPES.includes(type)) {
    throw new TransactionError(`Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
  }
}

/**
 * Build the ownership-scoped `where` shared by `listTransactions` and
 * `countTransactions`, so pagination's total-count query can never drift from
 * the page query's filters. A wallet/category filter is combined with
 * `userId` in the same `where`, so a wallet/category the caller does not own
 * simply yields zero rows (cross-user data is impossible).
 */
function buildWhere(input: ListTransactionsInput): Prisma.TransactionWhereInput {
  assertValidType(input.type);
  const dateFilter =
    input.startDate || input.endDate
      ? { startInclusive: input.startDate, endExclusive: input.endDate }
      : input.allTime
        ? undefined
        : resolveMonthRange(input.month, input.year).range;

  return {
    userId: input.userId,
    ...(input.walletId && { walletId: input.walletId }),
    ...(input.categoryId && { categoryId: input.categoryId }),
    ...(input.type && { type: input.type }),
    ...(dateFilter && {
      date: {
        ...(dateFilter.startInclusive && { gte: dateFilter.startInclusive }),
        ...(dateFilter.endExclusive && { lt: dateFilter.endExclusive }),
      },
    }),
  };
}

export function createTransactionQueryService(db: TransactionQueryPrismaClient) {
  /**
   * List a user's transactions, ownership-scoped. Applies the optional wallet,
   * category, and type filters, and — unless `allTime` — the reporting
   * month/year window. Ordering and the relation include match today; `limit`
   * is capped (0/absent → no cap) and `skip` offsets for page-based
   * pagination (Analytics v2 drill-down only — pre-existing callers never set it).
   */
  async function listTransactions(input: ListTransactionsInput): Promise<TransactionWithRelations[]> {
    const where = buildWhere(input);
    const take = resolveTake(input.limit);

    return db.transaction.findMany({
      where,
      include: TRANSACTION_INCLUDE,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      ...(take && { take }),
      ...(input.skip && { skip: input.skip }),
    });
  }

  /**
   * Total matching rows for the same filters `listTransactions` would apply
   * (ignoring `limit`/`skip`) — the pagination total for Analytics v2's
   * drill-down endpoint.
   */
  async function countTransactions(input: ListTransactionsInput): Promise<number> {
    return db.transaction.count({ where: buildWhere(input) });
  }

  /**
   * Monthly P&L for the given (or current) reporting month, ownership-scoped.
   *
   * Aggregation is done in the database via `groupBy` on `type` summing the
   * persisted `amount`. This is exact and readable here because the reporting
   * rules fall out of the query itself: TRANSFERs are excluded by the
   * `type IN (INCOME, EXPENSE)` filter (they net to zero — Invariant 4), and an
   * installment expense contributes its persisted monthly `amount`, which is
   * precisely the aggregate cash-flow effect (`getAggregateCashFlowEffect` uses
   * `amount`, not the wallet-locking `grandTotal`). Net savings is computed with
   * Decimal `.minus()` — no JS float subtraction, so no drift, NaN, or Infinity.
   * (In-memory reporting-effect aggregation would fetch every row for the same
   * result, so DB aggregation is preferred.)
   */
  async function getSummary(input: TransactionSummaryInput): Promise<TransactionSummaryResult> {
    const { range, month, year } = resolveMonthRange(input.month, input.year);

    const sums = await db.transaction.groupBy({
      by: ['type'],
      where: {
        userId: input.userId,
        type: { in: ['INCOME', 'EXPENSE'] },
        date: { gte: range.startInclusive, lt: range.endExclusive },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const sumFor = (t: string): Prisma.Decimal => sums.find((s) => s.type === t)?._sum.amount ?? new Prisma.Decimal(0);
    const income = sumFor('INCOME');
    const expenses = sumFor('EXPENSE');
    const transactionCount = sums.reduce((count, s) => count + s._count._all, 0);

    return {
      income,
      expenses,
      netSavings: income.minus(expenses),
      transactionCount,
      month: `${year}-${String(month).padStart(2, '0')}`,
    };
  }

  return { listTransactions, countTransactions, getSummary };
}

/** Production instance bound to the shared Prisma singleton. */
export const transactionQueryService = createTransactionQueryService(prisma);
