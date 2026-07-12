"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const response_1 = require("../utils/response");
const transaction_service_1 = require("../services/transaction.service");
const transaction_query_service_1 = require("../services/transaction-query.service");
const authContext_1 = require("../http/authContext");
const queryParsers_1 = require("../http/queryParsers");
const forwardError_1 = require("../http/forwardError");
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
/**
 * Allowlist + parse the supported list filters from the raw HTTP query into
 * service input. Each value is reduced to a safe scalar first (an array/object
 * shape can never reach the service or Prisma). Type validation and
 * month/year/limit normalization happen in the query service; this only extracts
 * and coerces. `userId`/`allTime` are set by the caller so a client can never
 * smuggle them in.
 */
function mapListTransactionQuery(query) {
    return {
        walletId: (0, queryParsers_1.scalarString)(query.walletId),
        // The service validates `type` against the allowed values; here we only
        // guarantee it is a scalar string (not an array/object).
        type: (0, queryParsers_1.scalarString)(query.type),
        month: (0, queryParsers_1.scalarInt)(query.month),
        year: (0, queryParsers_1.scalarInt)(query.year),
        limit: (0, queryParsers_1.scalarInt)(query.limit),
    };
}
// Decimal (Prisma) → number agar JSON-nya bersih buat frontend
const serialize = (tx) => ({
    ...tx,
    amount: parseFloat(tx.amount.toString()),
});
/**
 * Parse the summary `month=YYYY-MM` query into service input. A missing,
 * non-scalar, or malformed value yields `{}` so the query service falls back to
 * the current reporting month — exactly as before.
 */
function mapSummaryQuery(query) {
    const match = /^(\d{4})-(\d{2})$/.exec((0, queryParsers_1.scalarString)(query.month) ?? '');
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
            // Identity comes only from the canonical auth context — never the query.
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const transactions = await transaction_query_service_1.transactionQueryService.listTransactions({
                userId,
                ...mapListTransactionQuery(req.query),
            });
            (0, response_1.sendSuccess)(res, transactions.map(serialize), 'Retrieved transactions (current month)');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/transactions/summary?month=YYYY-MM
    // Monthly P&L: income, expenses, netSavings for the given calendar month
    // (defaults to current month). Filters on `date`, same as getAll.
    static async summary(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const result = await transaction_query_service_1.transactionQueryService.getSummary({
                userId,
                ...mapSummaryQuery(req.query),
            });
            (0, response_1.sendSuccess)(res, serializeSummary(result), 'Monthly summary');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/transactions/all — no month filter, returns everything
    static async getAllTime(req, res, next) {
        try {
            // Identity comes only from the canonical auth context — never the query.
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const transactions = await transaction_query_service_1.transactionQueryService.listTransactions({
                userId,
                allTime: true,
                ...mapListTransactionQuery(req.query),
            });
            (0, response_1.sendSuccess)(res, transactions.map(serialize), 'Retrieved all transactions');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/transactions
    // Layer 1: regular transactions (isInstallment: false)
    // Layer 2: installment transactions (isInstallment: true) — Model A architecture
    static async create(req, res, next) {
        try {
            // Identity is the authenticated caller only — never the request body/query.
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'userId is required (provide in body or use API key auth)', 400);
            }
            const created = await transaction_service_1.transactionService.createTransaction(mapCreateTransactionRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(created), 'Transaction created successfully', 201);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PUT /api/v1/transactions/:id
    // Reverses the persisted original effect, then applies the new effect —
    // both sides of a transfer included — atomically (Invariants 1–4).
    static async update(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const updated = await transaction_service_1.transactionService.updateTransaction(mapUpdateTransactionRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(updated), 'Transaction updated successfully');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // DELETE /api/v1/transactions/:id
    // Reverses the EXACT persisted effect (both transfer sides; an installment's
    // full grandTotal, not just the monthly amount) and removes the row atomically.
    static async delete(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const result = await transaction_service_1.transactionService.deleteTransaction({ userId, id: req.params.id });
            (0, response_1.sendSuccess)(res, result, `Transaction ${result.id} deleted successfully`);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=transaction.controller.js.map