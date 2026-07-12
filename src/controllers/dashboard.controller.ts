import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { dashboardQueryService } from '../services/dashboard-query.service';
import type { DashboardSummaryResult } from '../services/dashboard-query.types';

/** userId is injected by requireUser — never taken from the client. */
function resolveUserId(req: Request): string | undefined {
  return (req as unknown as { userId?: string }).userId;
}

/**
 * Serialize the service's Decimal totals into the existing numeric response.
 * This is the single response boundary (Decimal → number via parseFloat, exactly
 * as before); the service never converts. Field names and the bare (un-enveloped)
 * shape are preserved byte-for-byte for API compatibility.
 */
function serializeDashboardSummary(result: DashboardSummaryResult) {
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
export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const result = await dashboardQueryService.getSummary({ userId });
    return res.status(200).json(serializeDashboardSummary(result));
  } catch (err) {
    // Delegate to the central error handler (safe envelope + redacted logging).
    next(err);
  }
};
