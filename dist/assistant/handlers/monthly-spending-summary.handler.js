"use strict";
// ============================================================
// Assistant Core — monthly-spending-summary tool handler
// ------------------------------------------------------------
// Wires the registered tool to existing Pocket Mint services.
// Internally calls transactionQueryService.getSummary (P&L)
// and analyticsCategoriesService.getCategoryBreakdown (top
// expense categories). These are two existing read-only
// services that together produce one coherent monthly
// spending-summary capability — this is NOT a multi-tool
// workflow.
//
// Money: domain services return Prisma.Decimal. This handler
// serializes via Number(decimal.toString()), matching the
// convention used by AnalyticsController and the transaction
// summary endpoint. No financial arithmetic is performed with
// JS numbers inside Assistant Core.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMonthlySpendingSummary = handleMonthlySpendingSummary;
const client_1 = require("../../generated/prisma/client");
const config_1 = require("../../config");
const reportingTime_1 = require("../../domain/reportingTime");
const transaction_query_service_1 = require("../../services/transaction-query.service");
const analytics_categories_service_1 = require("../../services/analytics-categories.service");
// ---- Decimal serialization -------------------------------------------------
const ZERO = new client_1.Prisma.Decimal(0);
/** Convert a Prisma.Decimal to a JS number safely. */
function num(value) {
    return Number(value.toString());
}
// ---- Month parsing ---------------------------------------------------------
function parseMonth(month) {
    const [y, m] = month.split('-').map(Number);
    return { year: y, month: m };
}
// ---- Handler ----------------------------------------------------------------
async function handleMonthlySpendingSummary(input, ctx) {
    const calMonth = parseMonth(input.month);
    const range = (0, reportingTime_1.getReportingMonthRange)(calMonth, config_1.reportingConfig.timezone);
    // P&L from the existing monthly summary service.
    const summary = await transaction_query_service_1.transactionQueryService.getSummary({
        userId: ctx.userId,
        month: calMonth.month,
        year: calMonth.year,
    });
    // Top expense categories for the same period.
    // Must pass period: 'custom' so the resolver uses the provided date range
    // rather than defaulting to the current month.
    const categories = await analytics_categories_service_1.analyticsCategoriesService.getCategoryBreakdown({
        userId: ctx.userId,
        type: 'EXPENSE',
        period: 'custom',
        startDate: (0, reportingTime_1.formatReportingDate)(range.startInclusive, config_1.reportingConfig.timezone),
        endDate: (0, reportingTime_1.formatReportingDate)(range.endExclusive, config_1.reportingConfig.timezone),
    });
    const topCategories = categories.categories
        .slice(0, 10) // top 10, never unbounded
        .map((c) => ({
        name: c.name,
        amount: num(c.amount),
        percentage: c.percentage === null ? null : num(c.percentage),
    }));
    return {
        month: summary.month,
        totalIncome: num(summary.income),
        totalExpense: num(summary.expenses),
        netSavings: num(summary.netSavings),
        transactionCount: categories.categories.reduce((sum, c) => sum + c.transactionCount, 0),
        topCategories,
    };
}
//# sourceMappingURL=monthly-spending-summary.handler.js.map