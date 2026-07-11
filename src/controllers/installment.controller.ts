import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';

const VALID_STATUSES = ['ACTIVE', 'SETTLED', 'CANCELLED'];

// ponytail: static provider rates, matched against wallet name on the frontend;
// move to a DB table when rates need per-user overrides or admin management.
// rate = bunga flat %/bulan, adminFee = % dari pokok (sekali bayar, belum dipersist).
const PAYLATER_RATES = [
  { match: 'kredivo', name: 'Kredivo', rate: 2.6, adminFee: 0 },
  { match: 'spaylater', name: 'SPayLater', rate: 2.95, adminFee: 1 },
  { match: 'shopee', name: 'SPayLater', rate: 2.95, adminFee: 1 },
  { match: 'akulaku', name: 'Akulaku', rate: 3.5, adminFee: 1 },
  { match: 'gopay', name: 'GoPay Later', rate: 2.25, adminFee: 0 },
];

/**
 * GET /api/v1/installments/rates
 * Static paylater provider rates (bunga %/bulan + biaya admin %).
 */
export function getPaylaterRates(_req: Request, res: Response) {
  sendSuccess(res, PAYLATER_RATES, 'Retrieved paylater rates');
}

/**
 * GET /api/v1/installments
 * List installments for the authenticated user, optionally filtered by status.
 * Includes wallet name and type via relation.
 */
export async function getInstallments(
  req: Request<unknown, unknown, unknown, { status?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).userId;
    const { status } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      return sendError(res, `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const installments = await prisma.installment.findMany({
      where: {
        userId,
        ...(status && { status: status as any }),
      },
      include: {
        wallet: { select: { id: true, name: true, type: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    // Serialize Decimal fields to number
    const serialized = installments.map((inst) => ({
      id: inst.id,
      description: inst.description,
      walletId: inst.walletId,
      walletName: inst.wallet.name,
      walletType: inst.wallet.type,
      monthlyAmount: parseFloat(inst.monthlyAmount.toString()),
      currentTerm: inst.currentTerm,
      installmentMonths: inst.installmentMonths,
      totalAmount: parseFloat(inst.totalAmount.toString()),
      grandTotal: parseFloat(inst.grandTotal.toString()),
      totalInterest: parseFloat(inst.totalInterest.toString()),
      interestRate: parseFloat(inst.interestRate.toString()),
      status: inst.status,
      startDate: inst.startDate,
      balanceDeducted: inst.balanceDeducted,
    }));

    sendSuccess(res, serialized, 'Retrieved installments');
  } catch (err) {
    next(err);
  }
}
