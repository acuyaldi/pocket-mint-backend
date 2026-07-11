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
  reverseBalanceEffect,
  type FinancialTxType,
} from '../domain/transactionBalance';
import { TransactionError } from './transaction.errors';
import {
  TRANSACTION_INCLUDE,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type DeleteTransactionInput,
  type DeleteTransactionResult,
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

  /**
   * Update a transaction with reverse-then-apply semantics: reverse the persisted
   * original effect, update the row, apply the new effect — atomically. Reversal
   * derives from the stored row, never from request data. Installment rows and
   * legacy (destination-less) transfers are refused rather than re-balanced.
   */
  async function updateTransaction(input: UpdateTransactionInput): Promise<TransactionWithRelations> {
    const { userId, id, type, amount, description, date, categoryId, walletId, toWalletId } = input;

    if (type && !VALID_TYPES.includes(type)) {
      throw new TransactionError(`Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
    }
    if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
      throw new TransactionError('amount must be a positive number', 400, 'INVALID_AMOUNT');
    }

    let parsedDate: Date | undefined;
    if (date) {
      try {
        parsedDate = parseBusinessDate(date, reportingConfig.timezone);
      } catch (error) {
        throw new TransactionError(error instanceof Error ? error.message : 'date must be a valid date', 400, 'BAD_REQUEST');
      }
    }

    const existing = await db.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new TransactionError(`Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
    }
    // Installments are managed as a unit; editing the generated row would desync
    // grandTotal vs. the stored monthly amount.
    if (existing.isInstallment) {
      throw new TransactionError('Transaksi cicilan tidak bisa diubah langsung', 409, 'CONFLICT');
    }
    if (input.isInstallment === true) {
      throw new TransactionError('Tidak bisa mengubah transaksi biasa menjadi cicilan', 400, 'BAD_REQUEST');
    }
    // A legacy transfer has no destination to re-balance — refuse rather than drift.
    if (existing.type === 'TRANSFER' && !existing.toWalletId) {
      throw new TransactionError('Transfer lama tidak bisa diubah; hapus lalu buat ulang', 409, 'CONFLICT');
    }

    const newType = (type ?? existing.type) as FinancialTxType;
    const newAmount = amount !== undefined ? new Prisma.Decimal(Number(amount)) : existing.amount;
    const newWalletId = walletId ?? existing.walletId;
    const newToWalletId = newType === 'TRANSFER' ? (toWalletId ?? existing.toWalletId ?? null) : null;

    if (walletId) {
      const targetWallet = await db.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } });
      if (!targetWallet) {
        throw new TransactionError('Wallet tidak ditemukan', 404, 'WALLET_NOT_FOUND');
      }
    }

    if (newType === 'TRANSFER') {
      if (!newToWalletId) {
        throw new TransactionError('toWalletId is required for TRANSFER transactions', 400, 'INVALID_TRANSFER');
      }
      if (newToWalletId === newWalletId) {
        throw new TransactionError('Wallet asal dan tujuan tidak boleh sama', 400, 'INVALID_TRANSFER');
      }
      const destWallet = await db.wallet.findFirst({ where: { id: newToWalletId, userId }, select: { id: true } });
      if (!destWallet) {
        throw new TransactionError('Wallet tujuan tidak ditemukan', 404, 'WALLET_NOT_FOUND');
      }
    }

    try {
      return await db.$transaction(async (tx) => {
        // 1. Reverse the ORIGINAL effect from the persisted row.
        await applyBalanceDeltas(
          tx,
          reverseBalanceEffect({
            type: existing.type as FinancialTxType,
            amount: existing.amount,
            walletId: existing.walletId,
            toWalletId: existing.toWalletId,
          })
        );
        // 2. Update the row.
        const updated = await tx.transaction.update({
          where: { id },
          data: {
            ...(type !== undefined && { type }),
            ...(amount !== undefined && { amount: newAmount }),
            ...(description !== undefined && { description }),
            ...(parsedDate && { date: parsedDate }),
            ...(categoryId !== undefined && { categoryId: categoryId || null }),
            ...(walletId !== undefined && { walletId }),
            toWalletId: newToWalletId,
          },
          include: TRANSACTION_INCLUDE,
        });
        // 3. Apply the NEW effect.
        await applyBalanceDeltas(
          tx,
          computeBalanceEffect({
            type: newType,
            amount: newAmount,
            walletId: newWalletId,
            toWalletId: newToWalletId,
          })
        );
        return updated;
      });
    } catch (err) {
      if (err instanceof TransactionError) throw err;
      if ((err as { code?: string }).code === 'P2025') {
        throw new TransactionError(`Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
      }
      throw err;
    }
  }

  /**
   * Delete a transaction, reversing its EXACT persisted effect (both transfer
   * sides; an installment's full grandTotal, not the monthly amount) and removing
   * the linked installment row. Reversal never trusts request data. Legacy
   * transfers are refused.
   */
  async function deleteTransaction(input: DeleteTransactionInput): Promise<DeleteTransactionResult> {
    const { userId, id } = input;

    const existing = await db.transaction.findFirst({
      where: { id, userId },
      include: { installment: { select: { id: true, grandTotal: true } } },
    });
    if (!existing) {
      throw new TransactionError(`Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
    }
    if (existing.type === 'TRANSFER' && !existing.toWalletId) {
      throw new TransactionError('Transfer lama tidak bisa dihapus otomatis; sesuaikan saldo manual', 409, 'CONFLICT');
    }

    try {
      await db.$transaction(async (tx) => {
        if (existing.isInstallment) {
          await applyBalanceDeltas(
            tx,
            reverseBalanceEffect({
              type: 'EXPENSE',
              amount: existing.amount,
              walletId: existing.walletId,
              isInstallment: true,
              installmentGrandTotal: existing.installment?.grandTotal ?? existing.amount,
            })
          );
          await tx.transaction.delete({ where: { id } });
          if (existing.installmentId) {
            await tx.installment.delete({ where: { id: existing.installmentId } });
          }
        } else {
          await applyBalanceDeltas(
            tx,
            reverseBalanceEffect({
              type: existing.type as FinancialTxType,
              amount: existing.amount,
              walletId: existing.walletId,
              toWalletId: existing.toWalletId,
            })
          );
          await tx.transaction.delete({ where: { id } });
        }
      });
      return { id };
    } catch (err) {
      if (err instanceof TransactionError) throw err;
      if ((err as { code?: string }).code === 'P2025') {
        throw new TransactionError(`Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
      }
      throw err;
    }
  }

  return { createTransaction, updateTransaction, deleteTransaction };
}

/** Production instance bound to the shared Prisma singleton. */
export const transactionService = createTransactionService(prisma);
