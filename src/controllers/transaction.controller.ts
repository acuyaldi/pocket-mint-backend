import { Request, Response, NextFunction } from 'express';
import type { ParsedQs } from 'qs';
import { Prisma } from '../generated/prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { CreateTransactionDto, UpdateTransactionDto, type TransactionType } from '../models/transaction.model';
import { transactionService } from '../services/transaction.service';
import { transactionQueryService } from '../services/transaction-query.service';
import type { CreateTransactionInput, UpdateTransactionInput } from '../services/transaction.types';
import type { ListTransactionsInput, TransactionSummaryResult } from '../services/transaction-query.types';
import { getAuthenticatedUserId } from '../http/authContext';
import { scalarInt, scalarString } from '../http/queryParsers';
import { forwardError } from '../http/forwardError';

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
    billingMode: b.billingMode,
    installmentMonths: b.installmentMonths,
    interestRate: b.interestRate,
    firstDueDate: b.firstDueDate,
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

/**
 * Allowlist + parse the supported list filters from the raw HTTP query into
 * service input. Each value is reduced to a safe scalar first (an array/object
 * shape can never reach the service or Prisma). Type validation and
 * month/year/limit normalization happen in the query service; this only extracts
 * and coerces. `userId`/`allTime` are set by the caller so a client can never
 * smuggle them in.
 */
function mapListTransactionQuery(
  query: ParsedQs
): Omit<ListTransactionsInput, 'userId' | 'allTime'> {
  return {
    walletId: scalarString(query.walletId),
    // The service validates `type` against the allowed values; here we only
    // guarantee it is a scalar string (not an array/object).
    type: scalarString(query.type) as TransactionType | undefined,
    month: scalarInt(query.month),
    year: scalarInt(query.year),
    limit: scalarInt(query.limit),
  };
}

// Decimal (Prisma) → number agar JSON-nya bersih buat frontend
const serialize = <T extends { amount: Prisma.Decimal }>(tx: T) => ({
  ...tx,
  amount: parseFloat(tx.amount.toString()),
});

/** Exported so other controllers generating a Transaction (e.g. notification confirm) reuse the same serializer. */
export const serializeTransaction = serialize;

/**
 * Parse the summary `month=YYYY-MM` query into service input. A missing,
 * non-scalar, or malformed value yields `{}` so the query service falls back to
 * the current reporting month — exactly as before.
 */
function mapSummaryQuery(query: ParsedQs): { month?: number; year?: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(scalarString(query.month) ?? '');
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
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Identity comes only from the canonical auth context — never the query.
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const transactions = await transactionQueryService.listTransactions({
        userId,
        ...mapListTransactionQuery(req.query),
      });
      sendSuccess(res, transactions.map(serialize), 'Retrieved transactions (current month)');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // GET /api/v1/transactions/summary?month=YYYY-MM
  // Monthly P&L: income, expenses, netSavings for the given calendar month
  // (defaults to current month). Filters on `date`, same as getAll.
  static async summary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const result = await transactionQueryService.getSummary({
        userId,
        ...mapSummaryQuery(req.query),
      });
      sendSuccess(res, serializeSummary(result), 'Monthly summary');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // GET /api/v1/transactions/all — no month filter, returns everything
  static async getAllTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Identity comes only from the canonical auth context — never the query.
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const transactions = await transactionQueryService.listTransactions({
        userId,
        allTime: true,
        ...mapListTransactionQuery(req.query),
      });
      sendSuccess(res, transactions.map(serialize), 'Retrieved all transactions');
    } catch (err) {
      forwardError(err, res, next);
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
      // Identity is the authenticated caller only — never the request body/query.
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'userId is required (provide in body or use API key auth)', 400);
      }

      const created = await transactionService.createTransaction(
        mapCreateTransactionRequest(req, userId)
      );
      sendSuccess(res, serialize(created), 'Transaction created successfully', 201);
    } catch (err) {
      forwardError(err, res, next);
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
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const updated = await transactionService.updateTransaction(
        mapUpdateTransactionRequest(req, userId)
      );
      sendSuccess(res, serialize(updated), 'Transaction updated successfully');
    } catch (err) {
      forwardError(err, res, next);
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
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const result = await transactionService.deleteTransaction({ userId, id: req.params.id });
      sendSuccess(res, result, `Transaction ${result.id} deleted successfully`);
    } catch (err) {
      forwardError(err, res, next);
    }
  }
}
