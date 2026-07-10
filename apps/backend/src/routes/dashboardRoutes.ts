import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { requireUser } from '../middleware/apiKeyAuth';

const dashboardRouter = Router();

// GET /api/v1/dashboard/summary
dashboardRouter.get('/summary', requireUser, getDashboardSummary);

export { dashboardRouter };
