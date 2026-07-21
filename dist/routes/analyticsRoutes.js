"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const analyticsRouter = (0, express_1.Router)();
exports.analyticsRouter = analyticsRouter;
// All Analytics v2 endpoints are read-only GETs scoped by the authenticated
// caller; `generalLimiter` (applied globally in app.ts) already covers them —
// no extra `mutationLimiter` needed, matching the precedent set by
// /dashboard/summary, /transactions/summary, and GET /budgets.
analyticsRouter.get('/overview', apiKeyAuth_1.requireUser, analytics_controller_1.AnalyticsController.overview);
analyticsRouter.get('/trends', apiKeyAuth_1.requireUser, analytics_controller_1.AnalyticsController.trends);
analyticsRouter.get('/categories', apiKeyAuth_1.requireUser, analytics_controller_1.AnalyticsController.categories);
analyticsRouter.get('/wallets', apiKeyAuth_1.requireUser, analytics_controller_1.AnalyticsController.wallets);
analyticsRouter.get('/budget-performance', apiKeyAuth_1.requireUser, analytics_controller_1.AnalyticsController.budgetPerformance);
analyticsRouter.get('/transactions', apiKeyAuth_1.requireUser, analytics_controller_1.AnalyticsController.transactions);
//# sourceMappingURL=analyticsRoutes.js.map