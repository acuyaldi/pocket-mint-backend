"use strict";
// ============================================================
// Analytics v2 — category breakdown service
// ------------------------------------------------------------
// Per-category totals for one transaction type (EXPENSE or INCOME) over the
// resolved period, with an explicit "Uncategorized" group for null
// `categoryId` (never silently dropped — see `Transaction.categoryId`'s
// nullability). Aggregation is one grouped `transaction.groupBy` (never one
// query per category), plus a single follow-up `category.findMany` for
// names.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsCategoriesService = void 0;
exports.createAnalyticsCategoriesService = createAnalyticsCategoriesService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const analytics_period_1 = require("./analytics-period");
const analytics_errors_1 = require("./analytics.errors");
const ZERO = new client_1.Prisma.Decimal(0);
const HUNDRED = new client_1.Prisma.Decimal(100);
const UNCATEGORIZED_LABEL = 'Uncategorized';
const VALID_TYPES = ['EXPENSE', 'INCOME'];
function assertValidType(type) {
    if (!VALID_TYPES.includes(type)) {
        throw new analytics_errors_1.AnalyticsError(`Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
    }
}
function createAnalyticsCategoriesService(db) {
    async function getCategoryBreakdown(input) {
        const type = input.type ?? 'EXPENSE';
        assertValidType(type);
        const resolved = (0, analytics_period_1.resolvePeriodOrThrow)(input);
        const grouped = await db.transaction.groupBy({
            by: ['categoryId'],
            where: { userId: input.userId, type, date: { gte: resolved.range.startInclusive, lt: resolved.range.endExclusive } },
            _sum: { amount: true },
            _count: { _all: true },
        });
        const base = { period: resolved.period, periodStart: resolved.range.startInclusive, periodEnd: resolved.range.endExclusive, type };
        if (grouped.length === 0) {
            return { ...base, total: ZERO, categories: [] };
        }
        const categoryIds = grouped.map((g) => g.categoryId).filter((id) => id !== null);
        const categories = categoryIds.length > 0
            ? await db.category.findMany({ where: { id: { in: categoryIds }, userId: input.userId }, select: { id: true, name: true } })
            : [];
        const nameById = new Map(categories.map((c) => [c.id, c.name]));
        const total = grouped.reduce((sum, g) => sum.plus(g._sum.amount ?? ZERO), ZERO);
        const items = grouped.map((g) => {
            const amount = g._sum.amount ?? ZERO;
            return {
                categoryId: g.categoryId,
                name: g.categoryId === null ? UNCATEGORIZED_LABEL : (nameById.get(g.categoryId) ?? UNCATEGORIZED_LABEL),
                amount,
                transactionCount: g._count._all,
                percentage: total.equals(ZERO) ? null : amount.dividedBy(total).times(HUNDRED),
            };
        });
        // Stable ordering: amount desc, tie-broken by name so equal-amount groups
        // don't reorder between requests.
        items.sort((a, b) => b.amount.comparedTo(a.amount) || a.name.localeCompare(b.name));
        return { ...base, total, categories: items };
    }
    return { getCategoryBreakdown };
}
/** Production instance bound to the shared Prisma singleton. */
exports.analyticsCategoriesService = createAnalyticsCategoriesService(prisma_1.default);
//# sourceMappingURL=analytics-categories.service.js.map