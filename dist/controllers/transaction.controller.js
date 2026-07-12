"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const response_1 = require("../utils/response");
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
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
 * Build date range for a given month/year (defaults to current month).
 */
function getMonthRange(month, year) {
    const now = new Date();
    const current = (0, reportingTime_1.formatReportingDate)(now, config_1.reportingConfig.timezone).split('-').map(Number);
    const m = month ? Math.min(Math.max(parseInt(month, 10) || current[1], 1), 12) : current[1];
    const y = year ? parseInt(year, 10) || current[0] : current[0];
    const { startInclusive, endExclusive } = (0, reportingTime_1.getReportingMonthRange)({ month: m, year: y }, config_1.reportingConfig.timezone);
    return { startDate: startInclusive, endDate: endExclusive, month: m, year: y };
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
            // month param is YYYY-MM; fall back to current month when absent/invalid
            const match = /^(\d{4})-(\d{2})$/.exec(req.query.month ?? '');
            const { startDate, endDate, month, year } = getMonthRange(match?.[2], match?.[1]);
            const sums = await prisma_1.default.transaction.groupBy({
                by: ['type'],
                where: {
                    userId,
                    type: { in: ['INCOME', 'EXPENSE'] },
                    date: { gte: startDate, lt: endDate },
                },
                _sum: { amount: true },
            });
            const sumFor = (t) => {
                const row = sums.find((s) => s.type === t);
                return row?._sum.amount ?? new client_1.Prisma.Decimal(0);
            };
            const income = sumFor('INCOME');
            const expenses = sumFor('EXPENSE');
            (0, response_1.sendSuccess)(res, {
                income: Number(income.toString()),
                expenses: Number(expenses.toString()),
                netSavings: Number(income.minus(expenses).toString()),
                month: `${year}-${String(month).padStart(2, '0')}`,
            }, 'Monthly summary');
        }
        catch (err) {
            next(err);
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