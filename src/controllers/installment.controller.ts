import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { installmentQueryService } from '../services/installment-query.service';
import { installmentPaymentService } from '../services/installment-payment.service';
import type { InstallmentListItem } from '../services/installment-query.types';
import type { PayInstallmentResult } from '../services/installment-payment.types';
import { getAuthenticatedUserId } from '../http/authContext';
import { scalarString } from '../http/queryParsers';
import { forwardError } from '../http/forwardError';
import { reportingConfig } from '../config';
import { formatReportingDate } from '../domain/reportingTime';

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
 * Serialize one installment row into the existing numeric API shape. This is the
 * single response boundary (Decimal → number via parseFloat, exactly as before);
 * the query service never converts. Field names, ordering, and nullability are
 * preserved byte-for-byte for API compatibility. Stored contract values only —
 * no progress/remaining is computed (the schema has no paid-terms field).
 */
function serializeInstallment(inst: InstallmentListItem | PayInstallmentResult['installment']) {
  const storedStatus = inst.status;
  const nextDueDay = formatReportingDate(inst.nextDueDate, reportingConfig.timezone);
  const today = formatReportingDate(new Date(), reportingConfig.timezone);
  const status = storedStatus === 'ACTIVE' && nextDueDay < today ? 'OVERDUE' : storedStatus;
  const purchase = 'transactions' in inst
    ? inst.transactions.find((transaction) => transaction.type === 'EXPENSE')
    : undefined;

  return {
    id: inst.id,
    transactionId: purchase?.id ?? null,
    kind: inst.kind,
    description: inst.description,
    walletId: inst.walletId,
    walletName: inst.wallet.name,
    walletType: inst.wallet.type,
    monthlyAmount: parseFloat(inst.monthlyAmount.toString()),
    amountPerTerm: parseFloat(inst.monthlyAmount.toString()),
    currentTerm: inst.currentTerm,
    installmentMonths: inst.installmentMonths,
    totalTerms: inst.installmentMonths,
    paidTerms: inst.paidTerms,
    nextDueDate: inst.nextDueDate,
    totalAmount: parseFloat(inst.totalAmount.toString()),
    grandTotal: parseFloat(inst.grandTotal.toString()),
    totalInterest: parseFloat(inst.totalInterest.toString()),
    interestRate: parseFloat(inst.interestRate.toString()),
    status,
    startDate: inst.startDate,
    balanceDeducted: inst.balanceDeducted,
  };
}

function serializePayment(result: PayInstallmentResult) {
  return {
    installment: serializeInstallment(result.installment),
    transaction: {
      ...result.transaction,
      amount: parseFloat(result.transaction.amount.toString()),
    },
  };
}

/**
 * GET /api/v1/installments/rates
 * Static paylater provider rates (bunga %/bulan + biaya admin %). No identity and
 * no database access — pure config, so it stays a thin handler in the controller.
 */
export function getPaylaterRates(_req: Request, res: Response) {
  sendSuccess(res, PAYLATER_RATES, 'Retrieved paylater rates');
}

/**
 * GET /api/v1/installments
 * List installments for the authenticated user, optionally filtered by `status`.
 * Thin HTTP boundary: resolves the canonical `req.auth` identity, structurally
 * parses the `status` query scalar, delegates ownership-scoped reads and status
 * validation to the query service, serializes the Decimal result, and forwards
 * any thrown error (a typed 400 for an invalid status; anything unexpected to the
 * central handler). The service — never this handler — touches Prisma.
 */
export async function getInstallments(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const installments = await installmentQueryService.listInstallments({
      userId,
      status: scalarString(req.query.status),
    });

    return sendSuccess(res, installments.map(serializeInstallment), 'Retrieved installments');
  } catch (err) {
    return forwardError(err, res, next);
  }
}

export async function payInstallment(
  req: Request<{ id: string }, unknown, { sourceWalletId?: string; amount?: number | string; date?: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const paid = await installmentPaymentService.payInstallment({
      userId,
      installmentId: req.params.id,
      sourceWalletId: req.body.sourceWalletId ?? '',
      amount: req.body.amount ?? '',
      date: req.body.date,
    });

    return sendSuccess(res, serializePayment(paid), 'Installment payment recorded');
  } catch (err) {
    return forwardError(err, res, next);
  }
}
