import { Request, Response } from 'express';
import { getUserNetWorth } from '../utils/financial';

/**
 * GET /api/v1/dashboard/summary
 * Returns aggregated financial summary: total_aset, total_utang, net_worth.
 */
export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    // userId disuntik oleh requireUser — harus konsisten dengan endpoint lain
    const userId = (req as any).userId as string;

    const { totalAset, totalUtang, netWorth } = await getUserNetWorth(userId);

    return res.status(200).json({
      total_aset: parseFloat(totalAset.toString()),
      total_utang: parseFloat(totalUtang.toString()),
      net_worth: parseFloat(netWorth.toString()),
    });
  } catch (err) {
    console.error('getDashboardSummary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

