import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { CreateTransactionDto, UpdateTransactionDto, ListTransactionQuery, TransactionType } from '../models/transaction.model';
import { reportingConfig } from '../config';
import { formatReportingDate, getReportingMonthRange } from '../domain/reportingTime';
import { transactionService } from '../services/transaction.service';
import { TransactionError } from '../services/transaction.errors';
import type { CreateTransactionInput, UpdateTransactionInput } from '../services/transaction.types';

/**
 * Forward a service error. Typed operational errors keep the existing response
 * envelope (status + stable code + safe message); anything unexpected goes to
 * the central error handler untouched — never a manual 500 here.
 */
function forwardTransactionError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof TransactionError) {
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }
  next(err);
}

/** Allowlist create fields from the request body into the service input. */
function mapCreateTransactionRequest(
  req: Request<unknown, unknown, CreateTransactionDto>,
  userId: string
): CreateTransactionInput {
  const b = req.body;
  return {
    userId,
    type: b.type,
    amount: b.amount,
    walletId: b.walletId,
    toWalletId: b.toWalletId,
    categoryId: b.categoryId,
    description: b.description,
    date: b.date,
    isInstallment: b.isInstallment,
    installmentMonths: b.installmentMonths,
    interestRate: b.interestRate,
  };
}

/** Allowlist update fields from the request body into the service input. */
function mapUpdateTransactionRequest(
  req: Request<{ id: string }, unknown, UpdateTransactionDto>,
  userId: string
): UpdateTransactionInput {
  const b = req.body;
  return {
    userId,
    id: req.params.id,
    type: b.type,
    amount: b.amount,
    description: b.description,
    date: b.date,
    categoryId: b.categoryId,
    walletId: b.walletId,
    toWalletId: b.toWalletId,
    isInstallment: b.isInstallment,
  };
}

// Still used by the read endpoints (getAll/getAllTime) to validate the `type`
// filter. Mutation-side type/tenor/wallet rules now live in the service.
const VALID_TYPES: string[] = ['INCOME', 'EXPENSE', 'TRANSFER'];

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
  const current = formatReportingDate(now, reportingConfig.timezone).split('-').map(Number);
  const m = month ? Math.min(Math.max(parseInt(month, 10) || current[1], 1), 12) : current[1];
  const y = year ? parseInt(year, 10) || current[0] : current[0];
  const { startInclusive, endExclusive } = getReportingMonthRange({ month: m, year: y }, reportingConfig.timezone);
  return { startDate: startInclusive, endDate: endExclusive, month: m, year: y };
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
          date: { gte: startDate, lt: endDate },
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
          date: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
      });

      const sumFor = (t: string): Prisma.Decimal => {
        const row = sums.find((s) => s.type === t);
        return row?._sum.amount ?? new Prisma.Decimal(0);
      };

      const income = sumFor('INCOME');
      const expenses = sumFor('EXPENSE');

      sendSuccess(
        res,
        {
          income: Number(income.toString()),
          expenses: Number(expenses.toString()),
          netSavings: Number(income.minus(expenses).toString()),
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
      // userId is resolved here (HTTP concern); business logic lives in the service.
      const userId =
        (req as any).userId || req.body.userId || (req.query.userId as string | undefined);
      if (!userId) {
        return sendError(res, 'userId is required (provide in body or use API key auth)', 400);
      }

      const created = await transactionService.createTransaction(
        mapCreateTransactionRequest(req, userId)
      );
      sendSuccess(res, serialize(created), 'Transaction created successfully', 201);
    } catch (err) {
      forwardTransactionError(err, res, next);
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
      const userId = (req as any).userId as string;
      const updated = await transactionService.updateTransaction(
        mapUpdateTransactionRequest(req, userId)
      );
      sendSuccess(res, serialize(updated), 'Transaction updated successfully');
    } catch (err) {
      forwardTransactionError(err, res, next);
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
      const userId = (req as any).userId as string;
      const result = await transactionService.deleteTransaction({ userId, id: req.params.id });
      sendSuccess(res, result, `Transaction ${result.id} deleted successfully`);
    } catch (err) {
      forwardTransactionError(err, res, next);
    }
  }
}
