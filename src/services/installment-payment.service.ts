import prisma from '../lib/prisma';
import { Prisma, InstallmentStatus } from '../generated/prisma/client';
import { reportingConfig } from '../config';
import { parseBusinessDate } from '../domain/reportingTime';
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

const ALLOWED_SOURCE_TYPES = ['BANK', 'CASH'];

const INSTALLMENT_PAYMENT_INCLUDE = {
  wallet: { select: { id: true, name: true, type: true } },
  toWallet: { select: { id: true, name: true, type: true } },
} as const;

const PAID_INSTALLMENT_INCLUDE = {
  wallet: { select: { id: true, name: true, type: true } },
} as const;

function toDecimal(input: PayInstallmentInput['amount']): Prisma.Decimal {
  try {
    return new Prisma.Decimal(input);
  } catch {
    throw new InstallmentError('amount is required and must be a positive number', 400, 'INVALID_AMOUNT');
  }
}

export function createInstallmentPaymentService(db: InstallmentPaymentPrismaClient) {
  async function payInstallment(input: PayInstallmentInput): Promise<PayInstallmentResult> {
    const amount = toDecimal(input.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new InstallmentError('amount is required and must be a positive number', 400, 'INVALID_AMOUNT');
    }

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
    if (installment.currentTerm >= installment.installmentMonths) {
      throw new InstallmentError('Cicilan sudah lunas', 409, 'CONFLICT');
    }
    if (!amount.equals(installment.monthlyAmount)) {
      throw new InstallmentError('Jumlah pembayaran harus sama dengan cicilan bulanan', 400, 'INVALID_AMOUNT');
    }

    const sourceWallet = await db.wallet.findFirst({
      where: { id: input.sourceWalletId, userId: input.userId },
      select: { id: true, name: true, type: true, balance: true },
    });
    if (!sourceWallet) {
      throw new InstallmentError('Rekening sumber tidak ditemukan', 404, 'NOT_FOUND');
    }
    if (!ALLOWED_SOURCE_TYPES.includes(sourceWallet.type)) {
      throw new InstallmentError('Pembayaran cicilan hanya bisa dari rekening bank atau kas', 400, 'BAD_REQUEST');
    }
    if (sourceWallet.balance.lessThan(amount)) {
      throw new InstallmentError('Saldo rekening sumber tidak cukup', 400, 'INSUFFICIENT_FUNDS');
    }

    const nextTerm = installment.currentTerm + 1;
    const nextStatus =
      nextTerm >= installment.installmentMonths
        ? InstallmentStatus.SETTLED
        : InstallmentStatus.ACTIVE;

    return db.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: input.userId,
          walletId: input.sourceWalletId,
          toWalletId: installment.walletId,
          type: 'TRANSFER',
          amount,
          description: `Pembayaran cicilan — ${installment.description || installment.wallet.name}`,
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
          status: nextStatus,
        },
        include: PAID_INSTALLMENT_INCLUDE,
      });

      return { transaction, installment: updated };
    });
  }

  return { payInstallment };
}

export const installmentPaymentService = createInstallmentPaymentService(prisma);
