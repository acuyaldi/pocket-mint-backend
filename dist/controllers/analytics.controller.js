"use strict";
// ============================================================
// Analytics v2 controller
// ------------------------------------------------------------
// Thin HTTP mapping over the Analytics v2 services: allowlists/parses query
// params via the shared scalar helpers, resolves period errors through
// forwardError (typed `AnalyticsError`/`TransactionError` → safe envelope;
// anything else → central handler), and serializes Decimal → number only at
// this boundary (existing convention — services return Decimal).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const response_1 = require("../utils/response");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const queryParsers_1 = require("../http/queryParsers");
const analytics_period_1 = require("../services/analytics-period");
const analytics_overview_service_1 = require("../services/analytics-overview.service");
const analytics_trends_service_1 = require("../services/analytics-trends.service");
const analytics_categories_service_1 = require("../services/analytics-categories.service");
const analytics_wallets_service_1 = require("../services/analytics-wallets.service");
const budget_query_service_1 = require("../services/budget-query.service");
const transaction_query_service_1 = require("../services/transaction-query.service");
const transaction_controller_1 = require("./transaction.controller");
const DEFAULT_TRANSACTIONS_LIMIT = 20;
const MAX_TRANSACTIONS_LIMIT = 200;
/** Pull `period`/`startDate`/`endDate` from the query string as safe scalars only. */
function mapPeriodQuery(query) {
    return { period: (0, queryParsers_1.scalarString)(query.period), startDate: (0, queryParsers_1.scalarString)(query.startDate), endDate: (0, queryParsers_1.scalarString)(query.endDate) };
}
function num(value) {
    return Number(value.toString());
}
function serializePercentageChange(pc) {
    return pc.value === null ? { value: null, reason: pc.reason } : { value: num(pc.value), reason: null };
}
function serializeOverview(result) {
    return {
        period: result.period,
        periodStart: result.periodStart.toISOString(),
        periodEnd: result.periodEnd.toISOString(),
        income: num(result.income),
        expense: num(result.expense),
        netCashFlow: num(result.netCashFlow),
        transactionCount: result.transactionCount,
        previousPeriod: {
            periodStart: result.previous.periodStart.toISOString(),
            periodEnd: result.previous.periodEnd.toISOString(),
            income: num(result.previous.income),
            expense: num(result.previous.expense),
            netCashFlow: num(result.previous.netCashFlow),
        },
        change: {
            income: num(result.change.income),
            expense: num(result.change.expense),
            netCashFlow: num(result.change.netCashFlow),
        },
        percentageChange: {
            income: serializePercentageChange(result.percentageChange.income),
            expense: serializePercentageChange(result.percentageChange.expense),
            netCashFlow: serializePercentageChange(result.percentageChange.netCashFlow),
        },
    };
}
function serializeTrends(result) {
    return {
        period: result.period,
        periodStart: result.periodStart.toISOString(),
        periodEnd: result.periodEnd.toISOString(),
        granularity: result.granularity,
        buckets: result.buckets.map((b) => ({
            start: b.start.toISOString(),
            end: b.end.toISOString(),
            income: num(b.income),
            expense: num(b.expense),
            netCashFlow: num(b.netCashFlow),
        })),
    };
}
function serializeCategories(result) {
    return {
        period: result.period,
        periodStart: result.periodStart.toISOString(),
        periodEnd: result.periodEnd.toISOString(),
        type: result.type,
        total: num(result.total),
        categories: result.categories.map((c) => ({
            categoryId: c.categoryId,
            name: c.name,
            amount: num(c.amount),
            transactionCount: c.transactionCount,
            percentage: c.percentage === null ? null : num(c.percentage),
        })),
    };
}
function serializeWallets(result) {
    return {
        period: result.period,
        periodStart: result.periodStart.toISOString(),
        periodEnd: result.periodEnd.toISOString(),
        wallets: result.wallets.map((w) => ({
            id: w.id,
            name: w.name,
            income: num(w.income),
            expense: num(w.expense),
            netCashFlow: num(w.netCashFlow),
            transactionCount: w.transactionCount,
        })),
    };
}
/** Mirrors budget.controller.ts's `toBudgetDto`, renamed for the analytics response shape (limit/spent instead of amount/spent). Must numerically agree with `GET /budgets` — see test/analyticsBudgetPerformance.test.ts. */
function serializeBudgetPerformance(usage) {
    const { budget } = usage;
    return {
        id: budget.id,
        category: { id: budget.category.id, name: budget.category.name, type: budget.category.type },
        limit: num(budget.amount),
        spent: num(usage.spent),
        remaining: num(usage.remaining),
        percentUsed: usage.percentUsed === null ? null : num(usage.percentUsed),
        status: usage.status,
        isArchived: budget.isArchived,
        periodStart: usage.periodStart.toISOString(),
        periodEnd: usage.periodEnd.toISOString(),
    };
}
class AnalyticsController {
    // GET /api/v1/analytics/overview
    static async overview(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const result = await analytics_overview_service_1.analyticsOverviewService.getOverview({ userId, ...mapPeriodQuery(req.query) });
            (0, response_1.sendSuccess)(res, serializeOverview(result), 'Retrieved analytics overview');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/analytics/trends
    static async trends(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const result = await analytics_trends_service_1.analyticsTrendsService.getTrends({ userId, ...mapPeriodQuery(req.query) });
            (0, response_1.sendSuccess)(res, serializeTrends(result), 'Retrieved analytics trends');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/analytics/categories?type=EXPENSE|INCOME
    static async categories(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const type = ((0, queryParsers_1.scalarString)(req.query.type) ?? 'EXPENSE');
            const result = await analytics_categories_service_1.analyticsCategoriesService.getCategoryBreakdown({ userId, type, ...mapPeriodQuery(req.query) });
            (0, response_1.sendSuccess)(res, serializeCategories(result), 'Retrieved category breakdown');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/analytics/wallets
    static async wallets(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const result = await analytics_wallets_service_1.analyticsWalletsService.getWalletBreakdown({ userId, ...mapPeriodQuery(req.query) });
            (0, response_1.sendSuccess)(res, serializeWallets(result), 'Retrieved wallet breakdown');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/analytics/budget-performance
    // No `period` param — Budget is a recurring monthly construct (PD-009); this
    // always reflects the current reporting month, matching `GET /budgets`
    // exactly (verbatim reuse of budget-query.service.ts + domain/budget.ts).
    static async budgetPerformance(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const usages = await budget_query_service_1.budgetQueryService.listActiveBudgetUsage({ userId, status: 'active' });
            (0, response_1.sendSuccess)(res, usages.map(serializeBudgetPerformance), 'Retrieved budget performance');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/analytics/transactions?period=&type=&categoryId=&walletId=&page=&limit=
    // Drill-down: reuses the canonical transaction shape (transaction.controller.ts's
    // `serializeTransaction`) — no second transaction DTO.
    static async transactions(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const resolved = (0, analytics_period_1.resolvePeriodOrThrow)(mapPeriodQuery(req.query));
            const type = (0, queryParsers_1.scalarString)(req.query.type);
            const categoryId = (0, queryParsers_1.scalarString)(req.query.categoryId);
            const walletId = (0, queryParsers_1.scalarString)(req.query.walletId);
            const page = Math.max((0, queryParsers_1.scalarInt)(req.query.page) ?? 1, 1);
            const limit = Math.min(Math.max((0, queryParsers_1.scalarInt)(req.query.limit) ?? DEFAULT_TRANSACTIONS_LIMIT, 1), MAX_TRANSACTIONS_LIMIT);
            const skip = (page - 1) * limit;
            const filters = {
                userId,
                type,
                categoryId,
                walletId,
                startDate: resolved.range.startInclusive,
                endDate: resolved.range.endExclusive,
            };
            const [transactions, total] = await Promise.all([
                transaction_query_service_1.transactionQueryService.listTransactions({ ...filters, limit, skip }),
                transaction_query_service_1.transactionQueryService.countTransactions(filters),
            ]);
            (0, response_1.sendSuccess)(res, {
                period: resolved.period,
                periodStart: resolved.range.startInclusive.toISOString(),
                periodEnd: resolved.range.endExclusive.toISOString(),
                transactions: transactions.map(transaction_controller_1.serializeTransaction),
                pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
            }, 'Retrieved transactions');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.AnalyticsController = AnalyticsController;
//# sourceMappingURL=analytics.controller.js.map