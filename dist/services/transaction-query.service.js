"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionQueryService = void 0;
exports.createTransactionQueryService = createTransactionQueryService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
const transaction_errors_1 = require("./transaction.errors");
const transaction_query_types_1 = require("./transaction-query.types");
const VALID_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'];
const MAX_LIMIT = 200;
/** The current calendar month in the reporting timezone (never server-local). */
function currentReportingMonth() {
    const [year, month] = (0, reportingTime_1.formatReportingDate)(new Date(), config_1.reportingConfig.timezone).split('-').map(Number);
    return { year, month };
}
/**
 * Resolve an effective (month, year), reproducing the controller's prior
 * behavior exactly: an omitted value falls back to the current reporting month;
 * a provided month is clamped to 1–12 (with 0/NaN treated as "use current"); a
 * provided year uses its value unless it is 0/NaN.
 */
function resolveMonthYear(month, year) {
    const current = currentReportingMonth();
    const m = month === undefined ? current.month : Math.min(Math.max(month || current.month, 1), 12);
    const y = year === undefined ? current.year : year || current.year;
    return { month: m, year: y };
}
/** Resolve the half-open reporting month range plus the labels used in responses. */
function resolveMonthRange(month, year) {
    const { month: m, year: y } = resolveMonthYear(month, year);
    return { range: (0, reportingTime_1.getReportingMonthRange)({ month: m, year: y }, config_1.reportingConfig.timezone), month: m, year: y };
}
/**
 * Clamp a requested limit to a safe cap, matching the prior controller: values
 * ≤ 0 (or absent) mean "no cap", anything above MAX_LIMIT is capped.
 */
function resolveTake(limit) {
    if (limit === undefined)
        return undefined;
    const take = Math.min(Math.max(limit || 0, 0), MAX_LIMIT);
    return take > 0 ? take : undefined;
}
/** Reject an unsupported transaction-type filter with the same 400 the controller returned. */
function assertValidType(type) {
    if (type && !VALID_TYPES.includes(type)) {
        throw new transaction_errors_1.TransactionError(`Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
    }
}
function createTransactionQueryService(db) {
    /**
     * List a user's transactions, ownership-scoped. Applies the optional wallet and
     * type filters, and — unless `allTime` — the reporting month/year window. A
     * wallet filter is combined with `userId` in the same `where`, so a wallet the
     * caller does not own simply yields zero rows (cross-user data is impossible).
     * Ordering, relation includes, and the (uncapped-by-default) limit match today.
     */
    async function listTransactions(input) {
        assertValidType(input.type);
        const take = resolveTake(input.limit);
        const dateFilter = input.startDate || input.endDate
            ? { startInclusive: input.startDate, endExclusive: input.endDate }
            : input.allTime
                ? undefined
                : resolveMonthRange(input.month, input.year).range;
        const where = {
            userId: input.userId,
            ...(input.walletId && { walletId: input.walletId }),
            ...(input.type && { type: input.type }),
            ...(dateFilter && {
                date: {
                    ...(dateFilter.startInclusive && { gte: dateFilter.startInclusive }),
                    ...(dateFilter.endExclusive && { lt: dateFilter.endExclusive }),
                },
            }),
        };
        return db.transaction.findMany({
            where,
            include: transaction_query_types_1.TRANSACTION_INCLUDE,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            ...(take && { take }),
        });
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
    async function getSummary(input) {
        const { range, month, year } = resolveMonthRange(input.month, input.year);
        const sums = await db.transaction.groupBy({
            by: ['type'],
            where: {
                userId: input.userId,
                type: { in: ['INCOME', 'EXPENSE'] },
                date: { gte: range.startInclusive, lt: range.endExclusive },
            },
            _sum: { amount: true },
        });
        const sumFor = (t) => sums.find((s) => s.type === t)?._sum.amount ?? new client_1.Prisma.Decimal(0);
        const income = sumFor('INCOME');
        const expenses = sumFor('EXPENSE');
        return {
            income,
            expenses,
            netSavings: income.minus(expenses),
            month: `${year}-${String(month).padStart(2, '0')}`,
        };
    }
    return { listTransactions, getSummary };
}
/** Production instance bound to the shared Prisma singleton. */
exports.transactionQueryService = createTransactionQueryService(prisma_1.default);
//# sourceMappingURL=transaction-query.service.js.map