"use strict";
// ============================================================
// Analytics v2 — period resolution boundary
// ------------------------------------------------------------
// The ONE place the pure `resolveAnalyticsPeriod` (domain/analyticsPeriod.ts)
// is called from the service layer. Every analytics service and the
// drill-down transactions controller import this instead of calling the
// domain function directly, so a malformed period always produces the same
// typed 400 `AnalyticsError` (never an untyped 500) — a single translation
// point instead of a try/catch repeated in five call sites.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePeriodOrThrow = resolvePeriodOrThrow;
const config_1 = require("../config");
const analyticsPeriod_1 = require("../domain/analyticsPeriod");
const analytics_errors_1 = require("./analytics.errors");
function resolvePeriodOrThrow(input, now) {
    try {
        return (0, analyticsPeriod_1.resolveAnalyticsPeriod)(input, config_1.reportingConfig.timezone, now);
    }
    catch (err) {
        throw new analytics_errors_1.AnalyticsError(err instanceof Error ? err.message : 'Invalid period', 400, 'BAD_REQUEST');
    }
}
//# sourceMappingURL=analytics-period.js.map