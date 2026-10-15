"use strict";
// ============================================================
// Analytics v2 — trends service
// ------------------------------------------------------------
// A continuous, zero-filled income/expense/net-cash-flow series for the
// resolved period, bucketed daily (<=62 days) or monthly (longer), per
// `resolveTrendGranularity` (domain/analyticsPeriod.ts). Buckets are
// generated up front by the pure domain helper so gaps are structurally
// impossible; this service fetches the period's INCOME/EXPENSE rows ONCE
// (ordered by date) and folds them into the pre-built buckets in a single
// pass — no per-bucket query, no raw SQL date_trunc.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsTrendsService = void 0;
exports.createAnalyticsTrendsService = createAnalyticsTrendsService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const analyticsPeriod_1 = require("../domain/analyticsPeriod");
const config_1 = require("../config");
const analytics_period_1 = require("./analytics-period");
const ZERO = new client_1.Prisma.Decimal(0);
function createAnalyticsTrendsService(db) {
    async function getTrends(input) {
        const resolved = (0, analytics_period_1.resolvePeriodOrThrow)(input);
        const granularity = (0, analyticsPeriod_1.resolveTrendGranularity)(resolved.range);
        const buckets = (0, analyticsPeriod_1.generateTrendBuckets)(resolved.range, granularity, config_1.reportingConfig.timezone);
        const result = buckets.map((b) => ({ start: b.start, end: b.end, income: ZERO, expense: ZERO, netCashFlow: ZERO }));
        if (result.length === 0) {
            return { period: resolved.period, periodStart: resolved.range.startInclusive, periodEnd: resolved.range.endExclusive, granularity, buckets: result };
        }
        const rows = await db.transaction.findMany({
            where: {
                userId: input.userId,
                type: { in: ['INCOME', 'EXPENSE'] },
                date: { gte: resolved.range.startInclusive, lt: resolved.range.endExclusive },
            },
            select: { date: true, type: true, amount: true },
            orderBy: { date: 'asc' },
        });
        let bucketIndex = 0;
        for (const row of rows) {
            const t = row.date.getTime();
            while (bucketIndex < result.length - 1 && t >= result[bucketIndex].end.getTime())
                bucketIndex++;
            const bucket = result[bucketIndex];
            if (t < bucket.start.getTime() || t >= bucket.end.getTime())
                continue; // defensive: should be unreachable given contiguous buckets
            if (row.type === 'INCOME')
                bucket.income = bucket.income.plus(row.amount);
            else
                bucket.expense = bucket.expense.plus(row.amount);
        }
        for (const bucket of result)
            bucket.netCashFlow = bucket.income.minus(bucket.expense);
        return { period: resolved.period, periodStart: resolved.range.startInclusive, periodEnd: resolved.range.endExclusive, granularity, buckets: result };
    }
    return { getTrends };
}
/** Production instance bound to the shared Prisma singleton. */
exports.analyticsTrendsService = createAnalyticsTrendsService(prisma_1.default);
//# sourceMappingURL=analytics-trends.service.js.map