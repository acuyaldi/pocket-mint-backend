import prisma from '../lib/prisma';
import { Prisma, InstallmentStatus } from '../generated/prisma/client';
import { reportingConfig } from '../config';
import { formatReportingDate, parseBusinessDate } from '../domain/reportingTime';
import { addBillingMonth } from '../domain/billingCycle';
import { computeFinalMonthlyAmount } from '../domain/installment';
import {
  applyBalanceDeltas,
  computeBalanceEffect,
} from '../domain/transactionBalance';
import { InstallmentError } from './installment.errors';
import type {
  InstallmentPaymentPrismaClient,
  PayInstallmentInput,
  PayInstallmentResult,
} from './installment-payment.types';

const ALLOWED_SOURCE_TYPES = ['BANK', 'CASH', 'E_WALLET'];

const INSTALLMENT_PAYMENT_INCLUDE = {
  wallet: { select: { id: true, name: true, type: true } },
  toWallet: { select: { id: true, name: true, type: true } },
} as const;

const PAID_INSTALLMENT_INCLUDE = {
  wallet: { select: { id: true, name: true, type: true } },
} as const;

function toDecimal(input: NonNullable<PayInstallmentInput['amount']>): Prisma.Decimal {
  try {
    return new Prisma.Decimal(input);
  } catch {
    throw new InstallmentError('amount is required and must be a positive number', 400, 'INVALID_AMOUNT');
  }
}

export function createInstallmentPaymentService(db: InstallmentPaymentPrismaClient) {
  async function payInstallment(input: PayInstallmentInput): Promise<PayInstallmentResult> {
    let parsedDate: Date;
    try {
      parsedDate = parseBusinessDate(input.date, reportingConfig.timezone);
    } catch (error) {
      throw new InstallmentError(error instanceof Error ? error.message : 'date must be a valid date', 400, 'BAD_REQUEST');
    }

    const installment = await db.installment.findFirst({
      where: { id: input.installmentId, userId: input.userId },
      include: PAID_INSTALLMENT_INCLUDE,
    });
    if (!installment) {
      throw new InstallmentError('Cicilan tidak ditemukan', 404, 'NOT_FOUND');
    }
    if (installment.status !== InstallmentStatus.ACTIVE) {
      throw new InstallmentError('Cicilan tidak aktif', 409, 'CONFLICT');
    }
    if (installment.paidTerms >= installment.installmentMonths) {
      throw new InstallmentError('Tagihan sudah lunas', 409, 'CONFLICT');
    }
    const nextPaidTerms = installment.paidTerms + 1;
    const isFinalTerm = nextPaidTerms >= installment.installmentMonths;
    // Last term absorbs the rounding remainder so the schedule sums to grandTotal exactly.
    const expectedAmount = isFinalTerm
      ? computeFinalMonthlyAmount(installment.grandTotal, installment.monthlyAmount, installment.installmentMonths)
      : installment.monthlyAmount;

    const amount = input.amount === undefined ? expectedAmount : toDecimal(input.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new InstallmentError('amount is required and must be a positive number', 400, 'INVALID_AMOUNT');
    }
    if (!amount.equals(expectedAmount)) {
      throw new InstallmentError('Jumlah pembayaran harus sama dengan nominal termin', 400, 'INVALID_AMOUNT');
    }

    const sourceWallet = await db.wallet.findFirst({
      where: { id: input.sourceWalletId, userId: input.userId },
      select: { id: true, name: true, type: true, balance: true },
    });
    if (!sourceWallet) {
      throw new InstallmentError('Rekening sumber tidak ditemukan', 404, 'NOT_FOUND');
    }
    if (!ALLOWED_SOURCE_TYPES.includes(sourceWallet.type)) {
      throw new InstallmentError('Pembayaran tagihan hanya bisa dari kas, bank, atau e-wallet', 400, 'BAD_REQUEST');
    }
    if (sourceWallet.balance.lessThan(amount)) {
      throw new InstallmentError('Saldo rekening sumber tidak cukup', 400, 'INSUFFICIENT_FUNDS');
    }

    const nextTerm = Math.min(nextPaidTerms + 1, installment.installmentMonths);
    const nextStatus = isFinalTerm ? InstallmentStatus.SETTLED : InstallmentStatus.ACTIVE;
    const nextDueDate = nextStatus === InstallmentStatus.SETTLED
      ? installment.nextDueDate
      : parseBusinessDate(
          addBillingMonth(formatReportingDate(installment.nextDueDate, reportingConfig.timezone), 1),
          reportingConfig.timezone,
        );

    return db.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: input.userId,
          walletId: input.sourceWalletId,
          toWalletId: installment.walletId,
          type: 'TRANSFER',
          amount,
          description: `Pembayaran tagihan — ${installment.description || installment.wallet.name}`,
          date: parsedDate,
          isInstallment: false,
        },
        include: INSTALLMENT_PAYMENT_INCLUDE,
      });

      await applyBalanceDeltas(
        tx,
        computeBalanceEffect({
          type: 'TRANSFER',
          amount,
          walletId: input.sourceWalletId,
          toWalletId: installment.walletId,
        }),
      );

      const updated = await tx.installment.update({
        where: { id: installment.id },
        data: {
          currentTerm: nextTerm,
          paidTerms: nextPaidTerms,
          nextDueDate,
          status: nextStatus,
        },
        include: PAID_INSTALLMENT_INCLUDE,
      });

      return { transaction, installment: updated };
    });
  }

  return { payInstallment, payBill: payInstallment };
}

export const installmentPaymentService = createInstallmentPaymentService(prisma);
