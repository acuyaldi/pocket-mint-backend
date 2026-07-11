import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { CreateTransactionDto, UpdateTransactionDto, ListTransactionQuery, TransactionType } from '../models/transaction.model';
import {
  applyBalanceDeltas,
  computeBalanceEffect,
  reverseBalanceEffect,
  type FinancialTxType,
} from '../domain/transactionBalance';

const VALID_TYPES: string[] = ['INCOME', 'EXPENSE', 'TRANSFER'];
const CREDIT_WALLET_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];

const VALID_TENORS = [3, 6, 12];

// Decimal (Prisma) → number agar JSON-nya bersih buat frontend
const serialize = <T extends { amount: unknown }>(tx: T) => ({
  ...tx,
  amount: parseFloat((tx.amount as any).toString()),
});

/**
 * Build date range for a given month/year (defaults to current month).
 */
function getMonthRange(month?: string, year?: string) {
  const now = new Date();
  const m = month ? Math.min(Math.max(parseInt(month, 10) || now.getMonth() + 1, 1), 12) : now.getMonth() + 1;
  const y = year ? parseInt(year, 10) || now.getFullYear() : now.getFullYear();

  const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999); // last day of month
  return { startDate, endDate, month: m, year: y };
}

export class TransactionController {
  // GET /api/v1/transactions
  // Auto-filters to current month unless month/year explicitly provided.
  static async getAll(
    req: Request<unknown, unknown, unknown, ListTransactionQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // userId is injected by requireUser — always scope to the caller, never trust query.
      const userId = (req as any).userId as string;
      const { walletId, type, limit, month, year } = req.query;

      if (type && !VALID_TYPES.includes(type)) {
        return sendError(res, `Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400);
      }

      const take = limit ? Math.min(Math.max(parseInt(limit, 10) || 0, 0), 200) : undefined;

      // Auto-filter to current month
      const { startDate, endDate } = getMonthRange(month, year);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          ...(walletId && { walletId }),
          ...(type && { type: type as TransactionType }),
          // Current-month filter
          date: { gte: startDate, lte: endDate },
        },
        include: {
          wallet:   { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, type: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        ...(take && { take }),
      });

      sendSuccess(res, transactions.map(serialize), 'Retrieved transactions (current month)');
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/transactions/summary?month=YYYY-MM
  // Monthly P&L: income, expenses, netSavings for the given calendar month
  // (defaults to current month). Filters on `date`, same as getAll.
  static async summary(
    req: Request<unknown, unknown, unknown, { month?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).userId as string;

      // month param is YYYY-MM; fall back to current month when absent/invalid
      const match = /^(\d{4})-(\d{2})$/.exec(req.query.month ?? '');
      const { startDate, endDate, month, year } = getMonthRange(match?.[2], match?.[1]);

      const sums = await prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          type: { in: ['INCOME', 'EXPENSE'] },
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      });

      const sumFor = (t: string) => {
        const row = sums.find((s) => s.type === t);
        return row?._sum.amount ? parseFloat(row._sum.amount.toString()) : 0;
      };

      const income = sumFor('INCOME');
      const expenses = sumFor('EXPENSE');

      sendSuccess(
        res,
        {
          income,
          expenses,
          netSavings: income - expenses,
          month: `${year}-${String(month).padStart(2, '0')}`,
        },
        'Monthly summary'
      );
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/transactions/all — no month filter, returns everything
  static async getAllTime(
    req: Request<unknown, unknown, unknown, ListTransactionQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // userId is injected by requireUser — always scope to the caller, never trust query.
      const userId = (req as any).userId as string;
      const { walletId, type, limit } = req.query;

      if (type && !VALID_TYPES.includes(type)) {
        return sendError(res, `Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400);
      }

      const take = limit ? Math.min(Math.max(parseInt(limit, 10) || 0, 0), 200) : undefined;

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          ...(walletId && { walletId }),
          ...(type && { type: type as TransactionType }),
        },
        include: {
          wallet:   { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, type: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        ...(take && { take }),
      });

      sendSuccess(res, transactions.map(serialize), 'Retrieved all transactions');
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/transactions
  // Layer 1: regular transactions (isInstallment: false)
  // Layer 2: installment transactions (isInstallment: true) — Model A architecture
  static async create(
    req: Request<unknown, unknown, CreateTransactionDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // ---- Inject userId dari middleware ke body ----
      if ((req as any).userId && !req.body.userId) {
        req.body.userId = (req as any).userId;
      }

      const {
        walletId: bodyWalletId,
        toWalletId,
        categoryId,
        type,
        amount,
        description,
        date,
        isInstallment,
        installmentMonths,
        interestRate,
      } = req.body;

      // ---- Resolve userId ----
      const userId =
        req.body.userId ||
        (req as any).userId ||
        (req.query.userId as string | undefined);
      if (!userId) {
        return sendError(res, 'userId is required (provide in body or use API key auth)', 400);
      }

      // ---- Resolve walletId: body → first wallet milik user ----
      let walletId = bodyWalletId;
      if (!walletId) {
        const defaultWallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!defaultWallet) {
          return sendError(res, 'No wallet found for this user. Create a wallet first.', 400);
        }
        walletId = defaultWallet.id;
      }

      // ---- Validasi field wajib ----
      if (!type || !VALID_TYPES.includes(type)) {
        return sendError(res, `type is required and must be one of: ${VALID_TYPES.join(', ')}`, 400);
      }
      if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
        return sendError(res, 'amount is required and must be a positive number', 400);
      }
      if (type === 'TRANSFER' && !toWalletId) {
        return sendError(res, 'toWalletId is required for TRANSFER transactions', 400);
      }
      // A transfer must move value between two distinct wallets (Invariant 4).
      if (type === 'TRANSFER' && toWalletId === walletId) {
        return sendError(res, 'Wallet asal dan tujuan tidak boleh sama', 400, 'INVALID_TRANSFER');
      }

      let parsedDate = new Date();
      if (date) {
        parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return sendError(res, 'date must be a valid date (e.g. YYYY-MM-DD)', 400);
        }
      }

      const numAmount = Number(amount);

      // ---- Validate wallet exists AND belongs to the caller ----
      const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
      if (!wallet) {
        return sendError(res, 'Wallet tidak ditemukan', 404);
      }

      // ---- Validate transfer destination belongs to the caller ----
      if (type === 'TRANSFER' && toWalletId) {
        const toWallet = await prisma.wallet.findFirst({ where: { id: toWalletId, userId }, select: { id: true } });
        if (!toWallet) {
          return sendError(res, 'Wallet tujuan tidak ditemukan', 404);
        }
      }

      // ---- Validate category exists (if provided) AND belongs to the caller ----
      if (categoryId) {
        const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
        if (!category) {
          return sendError(res, 'Kategori tidak ditemukan', 404);
        }
      }

      // ─── LAYER 2: Installment transaction ─────────────────────────────
      const wantsInstallment = Boolean(isInstallment);

      if (wantsInstallment) {
        // Pre-validation: wallet must be DEBT type
        const isDebtWallet = CREDIT_WALLET_TYPES.includes(wallet.type);
        if (!isDebtWallet) {
          return sendError(res, 'Cicilan hanya tersedia untuk wallet DEBT', 400);
        }

        // Pre-validation: tenor must be valid
        if (!installmentMonths || !VALID_TENORS.includes(installmentMonths)) {
          return sendError(res, 'Tenor cicilan tidak valid', 400);
        }

        // Type must be EXPENSE for installments
        if (type !== 'EXPENSE') {
          return sendError(res, 'Cicilan hanya tersedia untuk tipe EXPENSE', 400);
        }

        // ---- Validate & parse interest rate ----
        const parsedInterestRate = interestRate !== undefined && interestRate !== null
          ? Number(interestRate)
          : 0;
        if (parsedInterestRate < 0) {
          return sendError(res, 'Bunga tidak boleh negatif', 400);
        }
        if (parsedInterestRate > 100) {
          return sendError(res, 'Bunga tidak valid', 400);
        }

        // ---- Interest calculations using Prisma.Decimal ----
        const totalAmount = new Prisma.Decimal(numAmount);
        const interestRateDecimal = new Prisma.Decimal(parsedInterestRate);
        // total_interest = amount × (interestRate / 100) × installmentMonths
        const totalInterest = new Prisma.Decimal(
          Math.round(numAmount * (parsedInterestRate / 100) * installmentMonths)
        );
        // grand_total = amount + total_interest
        const grandTotal = new Prisma.Decimal(
          Math.round(numAmount + totalInterest.toNumber())
        );
        // monthly_amount = grand_total / installmentMonths
        const monthlyAmount = new Prisma.Decimal(
          Math.round(grandTotal.toNumber() / installmentMonths)
        );

        try {
          const transaction = await prisma.$transaction(async (tx) => {
            // a. Create installment record with interest fields
            const installment = await tx.installment.create({
              data: {
                userId,
                walletId,
                totalAmount,
                interestRate: interestRateDecimal,
                totalInterest,
                grandTotal,
                installmentMonths,
                currentTerm: 1,
                monthlyAmount,
                status: 'ACTIVE',
                startDate: parsedDate,
                description: description ?? null,
                balanceDeducted: false,
              },
            });

            // b. Create 1 transaction record for this month's expense report
            const created = await tx.transaction.create({
              data: {
                userId,
                walletId,
                categoryId: categoryId ?? null,
                type: 'EXPENSE' as TransactionType,
                amount: monthlyAmount,
                description: description ?? null,
                date: parsedDate,
                isInstallment: true,
                installmentId: installment.id,
              },
              include: {
                wallet: { select: { id: true, name: true, type: true } },
                category: { select: { id: true, name: true, type: true } },
              },
            });

            // c. Deduct wallet.balance by grand_total (full debt including interest)
            await tx.wallet.update({
              where: { id: walletId },
              data: { balance: { decrement: grandTotal } },
            });

            // d. Mark installment as balance_deducted = true
            await tx.installment.update({
              where: { id: installment.id },
              data: { balanceDeducted: true },
            });

            return created;
          });

          return sendSuccess(res, serialize(transaction), 'Transaction created successfully', 201);
        } catch (txErr) {
          logger.error('installment transaction failed', {
            message: txErr instanceof Error ? txErr.message : String(txErr),
          });
          return sendError(res, 'Transaksi gagal', 500);
        }
      }

      // ─── LAYER 1: Regular transaction ──────────────────────────────────
      const amountDecimal = new Prisma.Decimal(numAmount);
      const destWalletId = type === 'TRANSFER' ? toWalletId! : null;

      const transaction = await prisma.$transaction(async (tx) => {
        const created = await tx.transaction.create({
          data: {
            userId,
            walletId,
            toWalletId: destWalletId,
            categoryId: categoryId ?? null,
            type: type as TransactionType,
            amount: amountDecimal,
            description: description ?? null,
            date: parsedDate,
            isInstallment: false,
          },
          include: {
            wallet: { select: { id: true, name: true, type: true } },
            category: { select: { id: true, name: true, type: true } },
          },
        });

        // Balance effect derived from one source of truth (transfer-symmetric,
        // atomic increments) so it can be reversed exactly on update/delete.
        await applyBalanceDeltas(
          tx,
          computeBalanceEffect({
            type: type as FinancialTxType,
            amount: amountDecimal,
            walletId,
            toWalletId: destWalletId,
          })
        );

        return created;
      });

      sendSuccess(res, serialize(transaction), 'Transaction created successfully', 201);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') {
        return sendError(res, 'Invalid userId, walletId, toWalletId, or categoryId (related record not found)', 400);
      }
      next(err);
    }
  }

  // PUT /api/v1/transactions/:id
  // Reverses the persisted original effect, then applies the new effect —
  // both sides of a transfer included — atomically (Invariants 1–4).
  static async update(
    req: Request<{ id: string }, unknown, UpdateTransactionDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { type, amount, description, date, categoryId, walletId, toWalletId } = req.body;

      if (type && !VALID_TYPES.includes(type)) {
        return sendError(res, `Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400);
      }
      if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
        return sendError(res, 'amount must be a positive number', 400, 'INVALID_AMOUNT');
      }

      let parsedDate: Date | undefined;
      if (date) {
        parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return sendError(res, 'date must be a valid date (e.g. YYYY-MM-DD)', 400);
        }
      }

      // Fetch the existing transaction (scoped to caller) to compute balance delta
      const userId = (req as any).userId as string;
      const existing = await prisma.transaction.findFirst({ where: { id, userId } });
      if (!existing) {
        return sendError(res, `Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
      }

      // Installment transactions are managed as a unit (installment + its debt),
      // not via ad-hoc edits to the generated expense row. Editing one here would
      // desync grandTotal vs. the stored monthly amount, so reject it outright.
      if (existing.isInstallment) {
        return sendError(res, 'Transaksi cicilan tidak bisa diubah langsung', 409, 'CONFLICT');
      }
      if (req.body.isInstallment === true) {
        return sendError(res, 'Tidak bisa mengubah transaksi biasa menjadi cicilan', 400);
      }
      // A legacy transfer (pre-toWalletId) cannot be reversed on its destination
      // side, so it cannot be safely re-balanced. Refuse rather than drift.
      if (existing.type === 'TRANSFER' && !existing.toWalletId) {
        return sendError(res, 'Transfer lama tidak bisa diubah; hapus lalu buat ulang', 409, 'CONFLICT');
      }

      const newType = (type ?? existing.type) as FinancialTxType;
      const newAmount = amount !== undefined ? new Prisma.Decimal(Number(amount)) : existing.amount;
      const newWalletId = walletId ?? existing.walletId;
      const newToWalletId =
        newType === 'TRANSFER' ? (toWalletId ?? existing.toWalletId ?? null) : null;

      // If moving to a different source wallet, it must belong to the caller.
      if (walletId) {
        const targetWallet = await prisma.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } });
        if (!targetWallet) {
          return sendError(res, 'Wallet tidak ditemukan', 404, 'WALLET_NOT_FOUND');
        }
      }

      // Validate the resulting transfer shape before any mutation.
      if (newType === 'TRANSFER') {
        if (!newToWalletId) {
          return sendError(res, 'toWalletId is required for TRANSFER transactions', 400, 'INVALID_TRANSFER');
        }
        if (newToWalletId === newWalletId) {
          return sendError(res, 'Wallet asal dan tujuan tidak boleh sama', 400, 'INVALID_TRANSFER');
        }
        const destWallet = await prisma.wallet.findFirst({ where: { id: newToWalletId, userId }, select: { id: true } });
        if (!destWallet) {
          return sendError(res, 'Wallet tujuan tidak ditemukan', 404, 'WALLET_NOT_FOUND');
        }
      }

      const transaction = await prisma.$transaction(async (tx) => {
        // 1. Reverse the ORIGINAL effect from the persisted row (never request data).
        await applyBalanceDeltas(
          tx,
          reverseBalanceEffect({
            type: existing.type as FinancialTxType,
            amount: existing.amount,
            walletId: existing.walletId,
            toWalletId: existing.toWalletId,
          })
        );

        // 2. Update the transaction row itself.
        const updated = await tx.transaction.update({
          where: { id },
          data: {
            ...(type !== undefined && { type: type as TransactionType }),
            ...(amount !== undefined && { amount: newAmount }),
            ...(description !== undefined && { description }),
            ...(parsedDate && { date: parsedDate }),
            ...(categoryId !== undefined && { categoryId: categoryId || null }),
            ...(walletId !== undefined && { walletId }),
            // Keep toWalletId consistent with the resulting type.
            toWalletId: newToWalletId,
          },
          include: {
            wallet:   { select: { id: true, name: true, type: true } },
            category: { select: { id: true, name: true, type: true } },
          },
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

      sendSuccess(res, serialize(transaction), 'Transaction updated successfully');
    } catch (err) {
      if ((err as { code?: string }).code === 'P2025') {
        return sendError(res, `Transaction with id ${req.params.id} not found`, 404, 'TRANSACTION_NOT_FOUND');
      }
      next(err);
    }
  }

  // DELETE /api/v1/transactions/:id
  // Reverses the EXACT persisted effect (both transfer sides; an installment's
  // full grandTotal, not just the monthly amount) and removes the row atomically.
  static async delete(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId as string;

      const existing = await prisma.transaction.findFirst({
        where: { id, userId },
        include: { installment: { select: { id: true, grandTotal: true } } },
      });
      if (!existing) {
        return sendError(res, `Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
      }

      // A legacy transfer has no persisted destination to credit back — deleting
      // it would leave the other wallet permanently drifted. Refuse.
      if (existing.type === 'TRANSFER' && !existing.toWalletId) {
        return sendError(res, 'Transfer lama tidak bisa dihapus otomatis; sesuaikan saldo manual', 409, 'CONFLICT');
      }

      await prisma.$transaction(async (tx) => {
        if (existing.isInstallment) {
          // Refund the FULL debt that was deducted at create (grandTotal), not
          // the stored monthly amount (fixes C2).
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
          // Remove the now-orphaned installment record (Model A: 1 installment ↔ 1 tx).
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

      sendSuccess(res, { id }, `Transaction ${id} deleted successfully`);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2025') {
        return sendError(res, `Transaction with id ${req.params.id} not found`, 404, 'TRANSACTION_NOT_FOUND');
      }
      next(err);
    }
  }
}
