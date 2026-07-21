import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { requireUser } from '../middleware/apiKeyAuth';

const analyticsRouter = Router();

// All Analytics v2 endpoints are read-only GETs scoped by the authenticated
// caller; `generalLimiter` (applied globally in app.ts) already covers them —
// no extra `mutationLimiter` needed, matching the precedent set by
// /dashboard/summary, /transactions/summary, and GET /budgets.
analyticsRouter.get('/overview', requireUser, AnalyticsController.overview);
analyticsRouter.get('/trends', requireUser, AnalyticsController.trends);
analyticsRouter.get('/categories', requireUser, AnalyticsController.categories);
analyticsRouter.get('/wallets', requireUser, AnalyticsController.wallets);
analyticsRouter.get('/budget-performance', requireUser, AnalyticsController.budgetPerformance);
analyticsRouter.get('/transactions', requireUser, AnalyticsController.transactions);

export { analyticsRouter };
