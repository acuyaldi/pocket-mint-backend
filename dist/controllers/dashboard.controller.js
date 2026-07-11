"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = void 0;
const financial_1 = require("../utils/financial");
/**
 * GET /api/v1/dashboard/summary
 * Returns aggregated financial summary: total_aset, total_utang, net_worth.
 */
const getDashboardSummary = async (req, res, next) => {
    try {
        // userId disuntik oleh requireUser — harus konsisten dengan endpoint lain
        const userId = req.userId;
        const { totalAset, totalUtang, netWorth } = await (0, financial_1.getUserNetWorth)(userId);
        return res.status(200).json({
            total_aset: parseFloat(totalAset.toString()),
            total_utang: parseFloat(totalUtang.toString()),
            net_worth: parseFloat(netWorth.toString()),
        });
    }
    catch (err) {
        // Delegate to the central error handler (safe envelope + redacted logging).
        next(err);
    }
};
exports.getDashboardSummary = getDashboardSummary;
//# sourceMappingURL=dashboard.controller.js.map