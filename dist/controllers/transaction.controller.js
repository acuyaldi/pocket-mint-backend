"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const response_1 = require("../utils/response");
const transaction_service_1 = require("../services/transaction.service");
const transaction_query_service_1 = require("../services/transaction-query.service");
const transaction_errors_1 = require("../services/transaction.errors");
/**
 * Forward a service error. Typed operational errors keep the existing response
 * envelope (status + stable code + safe message); anything unexpected goes to
 * the central error handler untouched — never a manual 500 here.
 */
function forwardTransactionError(err, res, next) {
    if (err instanceof transaction_errors_1.TransactionError) {
        (0, response_1.sendError)(res, err.message, err.statusCode, err.code);
        return;
    }
    next(err);
}
/** Allowlist create fields from the request body into the service input. */
function mapCreateTransactionRequest(req, userId) {
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
function mapUpdateTransactionRequest(req, userId) {
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
function toInt(value) {
    if (value === undefined)
        return undefined;
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? undefined : n;
}
/**
 * Allowlist + parse the supported list filters from the HTTP query into service
 * input. Type validation and month/year/limit normalization happen in the query
 * service; this only extracts and coerces. `userId`/`allTime` are set by the
 * caller so a client can never smuggle them in.
 */
function mapListTransactionQuery(query) {
    return {
        walletId: query.walletId,
        type: query.type,
        month: toInt(query.month),
        year: toInt(query.year),
        limit: toInt(query.limit),
    };
}
// Decimal (Prisma) → number agar JSON-nya bersih buat frontend
const serialize = (tx) => ({
    ...tx,
    amount: parseFloat(tx.amount.toString()),
});
/**
 * Parse the summary `month=YYYY-MM` query into service input. A missing or
 * malformed value yields `{}` so the query service falls back to the current
 * reporting month — exactly as before.
 */
function mapSummaryQuery(query) {
    const match = /^(\d{4})-(\d{2})$/.exec(query.month ?? '');
    return match ? { year: parseInt(match[1], 10), month: parseInt(match[2], 10) } : {};
}
/** Serialize the summary's Decimal totals into the existing numeric response. */
function serializeSummary(result) {
    return {
        income: Number(result.income.toString()),
        expenses: Number(result.expenses.toString()),
        netSavings: Number(result.netSavings.toString()),
        month: result.month,
    };
}
class TransactionController {
    // GET /api/v1/transactions
    // Auto-filters to current month unless month/year explicitly provided.
    static async getAll(req, res, next) {
        try {
            // userId is injected by requireUser — always scope to the caller, never trust query.
            const userId = req.userId;
            const transactions = await transaction_query_service_1.transactionQueryService.listTransactions({
                userId,
                ...mapListTransactionQuery(req.query),
            });
            (0, response_1.sendSuccess)(res, transactions.map(serialize), 'Retrieved transactions (current month)');
        }
        catch (err) {
            forwardTransactionError(err, res, next);
        }
    }
    // GET /api/v1/transactions/summary?month=YYYY-MM
    // Monthly P&L: income, expenses, netSavings for the given calendar month
    // (defaults to current month). Filters on `date`, same as getAll.
    static async summary(req, res, next) {
        try {
            const userId = req.userId;
            const result = await transaction_query_service_1.transactionQueryService.getSummary({
                userId,
                ...mapSummaryQuery(req.query),
            });
            (0, response_1.sendSuccess)(res, serializeSummary(result), 'Monthly summary');
        }
        catch (err) {
            forwardTransactionError(err, res, next);
        }
    }
    // GET /api/v1/transactions/all — no month filter, returns everything
    static async getAllTime(req, res, next) {
        try {
            // userId is injected by requireUser — always scope to the caller, never trust query.
            const userId = req.userId;
            const transactions = await transaction_query_service_1.transactionQueryService.listTransactions({
                userId,
                allTime: true,
                ...mapListTransactionQuery(req.query),
            });
            (0, response_1.sendSuccess)(res, transactions.map(serialize), 'Retrieved all transactions');
        }
        catch (err) {
            forwardTransactionError(err, res, next);
        }
    }
    // POST /api/v1/transactions
    // Layer 1: regular transactions (isInstallment: false)
    // Layer 2: installment transactions (isInstallment: true) — Model A architecture
    static async create(req, res, next) {
        try {
            // userId is resolved here (HTTP concern); business logic lives in the service.
            const userId = req.userId || req.body.userId || req.query.userId;
            if (!userId) {
                return (0, response_1.sendError)(res, 'userId is required (provide in body or use API key auth)', 400);
            }
            const created = await transaction_service_1.transactionService.createTransaction(mapCreateTransactionRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(created), 'Transaction created successfully', 201);
        }
        catch (err) {
            forwardTransactionError(err, res, next);
        }
    }
    // PUT /api/v1/transactions/:id
    // Reverses the persisted original effect, then applies the new effect —
    // both sides of a transfer included — atomically (Invariants 1–4).
    static async update(req, res, next) {
        try {
            const userId = req.userId;
            const updated = await transaction_service_1.transactionService.updateTransaction(mapUpdateTransactionRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(updated), 'Transaction updated successfully');
        }
        catch (err) {
            forwardTransactionError(err, res, next);
        }
    }
    // DELETE /api/v1/transactions/:id
    // Reverses the EXACT persisted effect (both transfer sides; an installment's
    // full grandTotal, not just the monthly amount) and removes the row atomically.
    static async delete(req, res, next) {
        try {
            const userId = req.userId;
            const result = await transaction_service_1.transactionService.deleteTransaction({ userId, id: req.params.id });
            (0, response_1.sendSuccess)(res, result, `Transaction ${result.id} deleted successfully`);
        }
        catch (err) {
            forwardTransactionError(err, res, next);
        }
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=transaction.controller.js.map