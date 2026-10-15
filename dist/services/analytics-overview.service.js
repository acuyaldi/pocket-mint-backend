"use strict";
// ============================================================
// Analytics v2 — overview service
// ------------------------------------------------------------
// Current-period totals (income/expense/net cash flow/transaction count)
// plus a comparison against the immediately preceding period of equal
// duration. TRANSFER rows are excluded (`type IN (INCOME, EXPENSE)`), same
// rule as transaction-query.service.ts's monthly summary. A zero previous-
// period baseline never produces `Infinity`/`NaN`: `percentageChange` is an
// explicit `{ value: null, reason: 'ZERO_BASELINE' }` instead.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsOverviewService = void 0;
exports.createAnalyticsOverviewService = createAnalyticsOverviewService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const analytics_period_1 = require("./analytics-period");
const ZERO = new client_1.Prisma.Decimal(0);
const HUNDRED = new client_1.Prisma.Decimal(100);
function sumFor(sums, type) {
    return sums.find((s) => s.type === type)?._sum.amount ?? ZERO;
}
function countFor(sums, type) {
    return sums.find((s) => s.type === type)?._count._all ?? 0;
}
function computeChange(current, previous) {
    const absolute = current.minus(previous);
    if (previous.equals(ZERO)) {
        return { absolute, percentage: { value: null, reason: 'ZERO_BASELINE' } };
    }
    return { absolute, percentage: { value: absolute.dividedBy(previous).times(HUNDRED) } };
}
function createAnalyticsOverviewService(db) {
    async function sumsFor(userId, range) {
        return db.transaction.groupBy({
            by: ['type'],
            where: { userId, type: { in: ['INCOME', 'EXPENSE'] }, date: { gte: range.startInclusive, lt: range.endExclusive } },
            _sum: { amount: true },
            _count: { _all: true },
        });
    }
    async function getOverview(input) {
        const resolved = (0, analytics_period_1.resolvePeriodOrThrow)(input);
        const [currentSums, previousSums] = await Promise.all([
            sumsFor(input.userId, resolved.range),
            sumsFor(input.userId, resolved.previousRange),
        ]);
        const income = sumFor(currentSums, 'INCOME');
        const expense = sumFor(currentSums, 'EXPENSE');
        const netCashFlow = income.minus(expense);
        const transactionCount = countFor(currentSums, 'INCOME') + countFor(currentSums, 'EXPENSE');
        const prevIncome = sumFor(previousSums, 'INCOME');
        const prevExpense = sumFor(previousSums, 'EXPENSE');
        const prevNet = prevIncome.minus(prevExpense);
        const incomeChange = computeChange(income, prevIncome);
        const expenseChange = computeChange(expense, prevExpense);
        const netChange = computeChange(netCashFlow, prevNet);
        return {
            period: resolved.period,
            periodStart: resolved.range.startInclusive,
            periodEnd: resolved.range.endExclusive,
            income,
            expense,
            netCashFlow,
            transactionCount,
            previous: {
                periodStart: resolved.previousRange.startInclusive,
                periodEnd: resolved.previousRange.endExclusive,
                income: prevIncome,
                expense: prevExpense,
                netCashFlow: prevNet,
            },
            change: { income: incomeChange.absolute, expense: expenseChange.absolute, netCashFlow: netChange.absolute },
            percentageChange: { income: incomeChange.percentage, expense: expenseChange.percentage, netCashFlow: netChange.percentage },
        };
    }
    return { getOverview };
}
/** Production instance bound to the shared Prisma singleton. */
exports.analyticsOverviewService = createAnalyticsOverviewService(prisma_1.default);
//# sourceMappingURL=analytics-overview.service.js.map