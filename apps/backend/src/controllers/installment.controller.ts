import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';

const VALID_STATUSES = ['ACTIVE', 'SETTLED', 'CANCELLED'];

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
    console.error('getInstallments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
