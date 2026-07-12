import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { CreateTransactionDto, UpdateTransactionDto, ListTransactionQuery } from '../models/transaction.model';
import { transactionService } from '../services/transaction.service';
import { transactionQueryService } from '../services/transaction-query.service';
import { TransactionError } from '../services/transaction.errors';
import type { CreateTransactionInput, UpdateTransactionInput } from '../services/transaction.types';
import type { ListTransactionsInput, TransactionSummaryResult } from '../services/transaction-query.types';

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

/** Parse an optional integer query param; empty/non-numeric → undefined. */
function toInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Allowlist + parse the supported list filters from the HTTP query into service
 * input. Type validation and month/year/limit normalization happen in the query
 * service; this only extracts and coerces. `userId`/`allTime` are set by the
 * caller so a client can never smuggle them in.
 */
function mapListTransactionQuery(
  query: ListTransactionQuery
): Omit<ListTransactionsInput, 'userId' | 'allTime'> {
  return {
    walletId: query.walletId,
    type: query.type,
    month: toInt(query.month),
    year: toInt(query.year),
    limit: toInt(query.limit),
  };
}

// Decimal (Prisma) → number agar JSON-nya bersih buat frontend
const serialize = <T extends { amount: unknown }>(tx: T) => ({
  ...tx,
  amount: parseFloat((tx.amount as any).toString()),
});

/**
 * Parse the summary `month=YYYY-MM` query into service input. A missing or
 * malformed value yields `{}` so the query service falls back to the current
 * reporting month — exactly as before.
 */
function mapSummaryQuery(query: { month?: string }): { month?: number; year?: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(query.month ?? '');
  return match ? { year: parseInt(match[1], 10), month: parseInt(match[2], 10) } : {};
}

/** Serialize the summary's Decimal totals into the existing numeric response. */
function serializeSummary(result: TransactionSummaryResult) {
  return {
    income: Number(result.income.toString()),
    expenses: Number(result.expenses.toString()),
    netSavings: Number(result.netSavings.toString()),
    month: result.month,
  };
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
      const transactions = await transactionQueryService.listTransactions({
        userId,
        ...mapListTransactionQuery(req.query),
      });
      sendSuccess(res, transactions.map(serialize), 'Retrieved transactions (current month)');
    } catch (err) {
      forwardTransactionError(err, res, next);
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
      const result = await transactionQueryService.getSummary({
        userId,
        ...mapSummaryQuery(req.query),
      });
      sendSuccess(res, serializeSummary(result), 'Monthly summary');
    } catch (err) {
      forwardTransactionError(err, res, next);
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
      const transactions = await transactionQueryService.listTransactions({
        userId,
        allTime: true,
        ...mapListTransactionQuery(req.query),
      });
      sendSuccess(res, transactions.map(serialize), 'Retrieved all transactions');
    } catch (err) {
      forwardTransactionError(err, res, next);
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
