// ============================================================
// Transaction service
// ------------------------------------------------------------
// Owns transaction business rules, ownership checks, the Prisma $transaction
// boundary, and balance-effect orchestration. It has no Express dependency and
// writes no HTTP responses: it returns typed domain records or throws typed
// TransactionErrors. Domain helpers (balance effects, installment plan, reporting
// time) do the calculation; this service orchestrates them.
//
// Dependency injection: the client is a narrow TransactionPrismaClient passed to
// the factory, so tests can supply a fake. The default `transactionService`
// binds the shared singleton for production.
// ============================================================

import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { reportingConfig } from '../config';
import { parseBusinessDate } from '../domain/reportingTime';
import { computeInstallmentPlan } from '../domain/installment';
import {
  applyBalanceDeltas,
  computeBalanceEffect,
  type FinancialTxType,
} from '../domain/transactionBalance';
import { TransactionError } from './transaction.errors';
import {
  TRANSACTION_INCLUDE,
  type CreateTransactionInput,
  type TransactionPrismaClient,
  type TransactionWithRelations,
} from './transaction.types';

const VALID_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'];
const CREDIT_WALLET_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];
const VALID_TENORS = [3, 6, 12];

/** Map a Prisma FK violation to the same 400 the controller used to return. */
function rethrowCreate(err: unknown): never {
  if (err instanceof TransactionError) throw err;
  if ((err as { code?: string }).code === 'P2003') {
    throw new TransactionError(
      'Invalid userId, walletId, toWalletId, or categoryId (related record not found)',
      400,
      'BAD_REQUEST'
    );
  }
  throw err;
}

export function createTransactionService(db: TransactionPrismaClient) {
  /**
   * Create a regular or installment transaction. Preserves the original order:
   * resolve wallet → validate type/amount/transfer → parse date → verify wallet,
   * destination, and category ownership → (installment branch or) atomic write.
   */
  async function createTransaction(input: CreateTransactionInput): Promise<TransactionWithRelations> {
    const { userId, type, toWalletId, categoryId } = input;

    // Resolve walletId: explicit, else the user's first wallet (unchanged default).
    let walletId = input.walletId;
    if (!walletId) {
      const defaultWallet = await db.wallet.findFirst({ where: { userId } });
      if (!defaultWallet) {
        throw new TransactionError('No wallet found for this user. Create a wallet first.', 400, 'BAD_REQUEST');
      }
      walletId = defaultWallet.id;
    }
    const resolvedWalletId = walletId;

    if (!type || !VALID_TYPES.includes(type)) {
      throw new TransactionError(`type is required and must be one of: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
    }
    const { amount } = input;
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new TransactionError('amount is required and must be a positive number', 400, 'BAD_REQUEST');
    }
    if (type === 'TRANSFER' && !toWalletId) {
      throw new TransactionError('toWalletId is required for TRANSFER transactions', 400, 'BAD_REQUEST');
    }
    if (type === 'TRANSFER' && toWalletId === resolvedWalletId) {
      throw new TransactionError('Wallet asal dan tujuan tidak boleh sama', 400, 'INVALID_TRANSFER');
    }

    let parsedDate: Date;
    try {
      parsedDate = parseBusinessDate(input.date, reportingConfig.timezone);
    } catch (error) {
      throw new TransactionError(error instanceof Error ? error.message : 'date must be a valid date', 400, 'BAD_REQUEST');
    }

    const numAmount = Number(amount);

    const wallet = await db.wallet.findFirst({ where: { id: resolvedWalletId, userId } });
    if (!wallet) {
      throw new TransactionError('Wallet tidak ditemukan', 404, 'NOT_FOUND');
    }

    if (type === 'TRANSFER' && toWalletId) {
      const toWallet = await db.wallet.findFirst({ where: { id: toWalletId, userId }, select: { id: true } });
      if (!toWallet) {
        throw new TransactionError('Wallet tujuan tidak ditemukan', 404, 'NOT_FOUND');
      }
    }

    if (categoryId) {
      const category = await db.category.findFirst({ where: { id: categoryId, userId } });
      if (!category) {
        throw new TransactionError('Kategori tidak ditemukan', 404, 'NOT_FOUND');
      }
    }

    try {
      // ─── Installment (Model A: one Installment ↔ one Transaction) ──────────
      if (input.isInstallment) {
        if (!CREDIT_WALLET_TYPES.includes(wallet.type)) {
          throw new TransactionError('Cicilan hanya tersedia untuk wallet DEBT', 400, 'BAD_REQUEST');
        }
        const { installmentMonths } = input;
        if (!installmentMonths || !VALID_TENORS.includes(installmentMonths)) {
          throw new TransactionError('Tenor cicilan tidak valid', 400, 'BAD_REQUEST');
        }
        if (type !== 'EXPENSE') {
          throw new TransactionError('Cicilan hanya tersedia untuk tipe EXPENSE', 400, 'BAD_REQUEST');
        }
        const parsedInterestRate =
          input.interestRate !== undefined && input.interestRate !== null ? Number(input.interestRate) : 0;
        if (parsedInterestRate < 0) throw new TransactionError('Bunga tidak boleh negatif', 400, 'BAD_REQUEST');
        if (parsedInterestRate > 100) throw new TransactionError('Bunga tidak valid', 400, 'BAD_REQUEST');

        const interestRateDecimal = new Prisma.Decimal(parsedInterestRate);
        const { totalAmount, totalInterest, grandTotal, monthlyAmount } = computeInstallmentPlan({
          principal: new Prisma.Decimal(numAmount),
          interestRatePctPerMonth: interestRateDecimal,
          months: installmentMonths,
        });

        return await db.$transaction(async (tx) => {
          const installment = await tx.installment.create({
            data: {
              userId,
              walletId: resolvedWalletId,
              totalAmount,
              interestRate: interestRateDecimal,
              totalInterest,
              grandTotal,
              installmentMonths,
              currentTerm: 1,
              monthlyAmount,
              status: 'ACTIVE',
              startDate: parsedDate,
              description: input.description ?? null,
              balanceDeducted: false,
            },
          });
          const created = await tx.transaction.create({
            data: {
              userId,
              walletId: resolvedWalletId,
              categoryId: categoryId ?? null,
              type: 'EXPENSE',
              amount: monthlyAmount,
              description: input.description ?? null,
              date: parsedDate,
              isInstallment: true,
              installmentId: installment.id,
            },
            include: TRANSACTION_INCLUDE,
          });
          // Deduct the full debt (grandTotal), locked on the wallet at create.
          await tx.wallet.update({ where: { id: resolvedWalletId }, data: { balance: { decrement: grandTotal } } });
          await tx.installment.update({ where: { id: installment.id }, data: { balanceDeducted: true } });
          return created;
        });
      }

      // ─── Regular transaction ──────────────────────────────────────────────
      const amountDecimal = new Prisma.Decimal(numAmount);
      const destWalletId = type === 'TRANSFER' ? toWalletId! : null;

      return await db.$transaction(async (tx) => {
        const created = await tx.transaction.create({
          data: {
            userId,
            walletId: resolvedWalletId,
            toWalletId: destWalletId,
            categoryId: categoryId ?? null,
            type,
            amount: amountDecimal,
            description: input.description ?? null,
            date: parsedDate,
            isInstallment: false,
          },
          include: TRANSACTION_INCLUDE,
        });
        // One source of truth for the balance effect → reversible on update/delete.
        await applyBalanceDeltas(
          tx,
          computeBalanceEffect({
            type: type as FinancialTxType,
            amount: amountDecimal,
            walletId: resolvedWalletId,
            toWalletId: destWalletId,
          })
        );
        return created;
      });
    } catch (err) {
      rethrowCreate(err);
    }
  }

  return { createTransaction };
}

/** Production instance bound to the shared Prisma singleton. */
export const transactionService = createTransactionService(prisma);
