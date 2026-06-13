import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { apiKeyAuth } from '../middleware/apiKeyAuth';

const dashboardRouter = Router();

// GET /api/v1/dashboard/summary
dashboardRouter.get('/summary', apiKeyAuth, getDashboardSummary);

export { dashboardRouter };
