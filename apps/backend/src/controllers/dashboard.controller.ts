import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getUserNetWorth } from '../utils/financial';

/**
 * GET /api/v1/dashboard/summary
 * Returns aggregated financial summary: total_aset, total_utang, net_worth.
 */
export const getDashboardSummary = async (_req: Request, res: Response) => {
  try {
    // TODO: ganti dengan session auth
    const userId = 'cmqcce9360000dfs48tkbmv4r';

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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

