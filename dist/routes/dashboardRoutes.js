"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const dashboardRouter = (0, express_1.Router)();
exports.dashboardRouter = dashboardRouter;
// GET /api/v1/dashboard/summary
dashboardRouter.get('/summary', apiKeyAuth_1.requireUser, dashboard_controller_1.getDashboardSummary);
//# sourceMappingURL=dashboardRoutes.js.map