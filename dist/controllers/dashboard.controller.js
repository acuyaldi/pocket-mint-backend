"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = void 0;
const response_1 = require("../utils/response");
const dashboard_query_service_1 = require("../services/dashboard-query.service");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
/**
 * Serialize the service's Decimal totals into the existing numeric response.
 * This is the single response boundary (Decimal → number via parseFloat, exactly
 * as before); the service never converts. Field names and the bare (un-enveloped)
 * shape are preserved byte-for-byte for API compatibility.
 */
function serializeDashboardSummary(result) {
    return {
        total_aset: parseFloat(result.totalAset.toString()),
        total_utang: parseFloat(result.totalUtang.toString()),
        net_worth: parseFloat(result.netWorth.toString()),
    };
}
/**
 * GET /api/v1/dashboard/summary
 * Returns aggregated financial summary: total_aset, total_utang, net_worth.
 */
const getDashboardSummary = async (req, res, next) => {
    try {
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const result = await dashboard_query_service_1.dashboardQueryService.getSummary({ userId });
        return res.status(200).json(serializeDashboardSummary(result));
    }
    catch (err) {
        // No operational errors are thrown on this read path, so this always
        // delegates to the central error handler (safe envelope + redacted logging).
        (0, forwardError_1.forwardError)(err, res, next);
    }
};
exports.getDashboardSummary = getDashboardSummary;
//# sourceMappingURL=dashboard.controller.js.map