"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const response_1 = require("../utils/response");
const transactionBalance_1 = require("../domain/transactionBalance");
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
const transaction_service_1 = require("../services/transaction.service");
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
const VALID_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'];
const CREDIT_WALLET_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];
const VALID_TENORS = [3, 6, 12];
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
            const { walletId, type, limit, month, year } = req.query;
            if (type && !VALID_TYPES.includes(type)) {
                return (0, response_1.sendError)(res, `Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400);
            }
            const take = limit ? Math.min(Math.max(parseInt(limit, 10) || 0, 0), 200) : undefined;
            // Auto-filter to current month
            const { startDate, endDate } = getMonthRange(month, year);
            const transactions = await prisma_1.default.transaction.findMany({
                where: {
                    userId,
                    ...(walletId && { walletId }),
                    ...(type && { type: type }),
                    // Current-month filter
                    date: { gte: startDate, lt: endDate },
                },
                include: {
                    wallet: { select: { id: true, name: true, type: true } },
                    category: { select: { id: true, name: true, type: true } },
                },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                ...(take && { take }),
            });
            (0, response_1.sendSuccess)(res, transactions.map(serialize), 'Retrieved transactions (current month)');
        }
        catch (err) {
            next(err);
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
            const { walletId, type, limit } = req.query;
            if (type && !VALID_TYPES.includes(type)) {
                return (0, response_1.sendError)(res, `Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400);
            }
            const take = limit ? Math.min(Math.max(parseInt(limit, 10) || 0, 0), 200) : undefined;
            const transactions = await prisma_1.default.transaction.findMany({
                where: {
                    userId,
                    ...(walletId && { walletId }),
                    ...(type && { type: type }),
                },
                include: {
                    wallet: { select: { id: true, name: true, type: true } },
                    category: { select: { id: true, name: true, type: true } },
                },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                ...(take && { take }),
            });
            (0, response_1.sendSuccess)(res, transactions.map(serialize), 'Retrieved all transactions');
        }
        catch (err) {
            next(err);
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
            const { id } = req.params;
            const { type, amount, description, date, categoryId, walletId, toWalletId } = req.body;
            if (type && !VALID_TYPES.includes(type)) {
                return (0, response_1.sendError)(res, `Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400);
            }
            if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
                return (0, response_1.sendError)(res, 'amount must be a positive number', 400, 'INVALID_AMOUNT');
            }
            let parsedDate;
            if (date) {
                try {
                    parsedDate = (0, reportingTime_1.parseBusinessDate)(date, config_1.reportingConfig.timezone);
                }
                catch (error) {
                    return (0, response_1.sendError)(res, error instanceof Error ? error.message : 'date must be a valid date', 400);
                }
            }
            // Fetch the existing transaction (scoped to caller) to compute balance delta
            const userId = req.userId;
            const existing = await prisma_1.default.transaction.findFirst({ where: { id, userId } });
            if (!existing) {
                return (0, response_1.sendError)(res, `Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
            }
            // Installment transactions are managed as a unit (installment + its debt),
            // not via ad-hoc edits to the generated expense row. Editing one here would
            // desync grandTotal vs. the stored monthly amount, so reject it outright.
            if (existing.isInstallment) {
                return (0, response_1.sendError)(res, 'Transaksi cicilan tidak bisa diubah langsung', 409, 'CONFLICT');
            }
            if (req.body.isInstallment === true) {
                return (0, response_1.sendError)(res, 'Tidak bisa mengubah transaksi biasa menjadi cicilan', 400);
            }
            // A legacy transfer (pre-toWalletId) cannot be reversed on its destination
            // side, so it cannot be safely re-balanced. Refuse rather than drift.
            if (existing.type === 'TRANSFER' && !existing.toWalletId) {
                return (0, response_1.sendError)(res, 'Transfer lama tidak bisa diubah; hapus lalu buat ulang', 409, 'CONFLICT');
            }
            const newType = (type ?? existing.type);
            const newAmount = amount !== undefined ? new client_1.Prisma.Decimal(Number(amount)) : existing.amount;
            const newWalletId = walletId ?? existing.walletId;
            const newToWalletId = newType === 'TRANSFER' ? (toWalletId ?? existing.toWalletId ?? null) : null;
            // If moving to a different source wallet, it must belong to the caller.
            if (walletId) {
                const targetWallet = await prisma_1.default.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } });
                if (!targetWallet) {
                    return (0, response_1.sendError)(res, 'Wallet tidak ditemukan', 404, 'WALLET_NOT_FOUND');
                }
            }
            // Validate the resulting transfer shape before any mutation.
            if (newType === 'TRANSFER') {
                if (!newToWalletId) {
                    return (0, response_1.sendError)(res, 'toWalletId is required for TRANSFER transactions', 400, 'INVALID_TRANSFER');
                }
                if (newToWalletId === newWalletId) {
                    return (0, response_1.sendError)(res, 'Wallet asal dan tujuan tidak boleh sama', 400, 'INVALID_TRANSFER');
                }
                const destWallet = await prisma_1.default.wallet.findFirst({ where: { id: newToWalletId, userId }, select: { id: true } });
                if (!destWallet) {
                    return (0, response_1.sendError)(res, 'Wallet tujuan tidak ditemukan', 404, 'WALLET_NOT_FOUND');
                }
            }
            const transaction = await prisma_1.default.$transaction(async (tx) => {
                // 1. Reverse the ORIGINAL effect from the persisted row (never request data).
                await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.reverseBalanceEffect)({
                    type: existing.type,
                    amount: existing.amount,
                    walletId: existing.walletId,
                    toWalletId: existing.toWalletId,
                }));
                // 2. Update the transaction row itself.
                const updated = await tx.transaction.update({
                    where: { id },
                    data: {
                        ...(type !== undefined && { type: type }),
                        ...(amount !== undefined && { amount: newAmount }),
                        ...(description !== undefined && { description }),
                        ...(parsedDate && { date: parsedDate }),
                        ...(categoryId !== undefined && { categoryId: categoryId || null }),
                        ...(walletId !== undefined && { walletId }),
                        // Keep toWalletId consistent with the resulting type.
                        toWalletId: newToWalletId,
                    },
                    include: {
                        wallet: { select: { id: true, name: true, type: true } },
                        category: { select: { id: true, name: true, type: true } },
                    },
                });
                // 3. Apply the NEW effect.
                await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.computeBalanceEffect)({
                    type: newType,
                    amount: newAmount,
                    walletId: newWalletId,
                    toWalletId: newToWalletId,
                }));
                return updated;
            });
            (0, response_1.sendSuccess)(res, serialize(transaction), 'Transaction updated successfully');
        }
        catch (err) {
            if (err.code === 'P2025') {
                return (0, response_1.sendError)(res, `Transaction with id ${req.params.id} not found`, 404, 'TRANSACTION_NOT_FOUND');
            }
            next(err);
        }
    }
    // DELETE /api/v1/transactions/:id
    // Reverses the EXACT persisted effect (both transfer sides; an installment's
    // full grandTotal, not just the monthly amount) and removes the row atomically.
    static async delete(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const existing = await prisma_1.default.transaction.findFirst({
                where: { id, userId },
                include: { installment: { select: { id: true, grandTotal: true } } },
            });
            if (!existing) {
                return (0, response_1.sendError)(res, `Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
            }
            // A legacy transfer has no persisted destination to credit back — deleting
            // it would leave the other wallet permanently drifted. Refuse.
            if (existing.type === 'TRANSFER' && !existing.toWalletId) {
                return (0, response_1.sendError)(res, 'Transfer lama tidak bisa dihapus otomatis; sesuaikan saldo manual', 409, 'CONFLICT');
            }
            await prisma_1.default.$transaction(async (tx) => {
                if (existing.isInstallment) {
                    // Refund the FULL debt that was deducted at create (grandTotal), not
                    // the stored monthly amount (fixes C2).
                    await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.reverseBalanceEffect)({
                        type: 'EXPENSE',
                        amount: existing.amount,
                        walletId: existing.walletId,
                        isInstallment: true,
                        installmentGrandTotal: existing.installment?.grandTotal ?? existing.amount,
                    }));
                    await tx.transaction.delete({ where: { id } });
                    // Remove the now-orphaned installment record (Model A: 1 installment ↔ 1 tx).
                    if (existing.installmentId) {
                        await tx.installment.delete({ where: { id: existing.installmentId } });
                    }
                }
                else {
                    await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.reverseBalanceEffect)({
                        type: existing.type,
                        amount: existing.amount,
                        walletId: existing.walletId,
                        toWalletId: existing.toWalletId,
                    }));
                    await tx.transaction.delete({ where: { id } });
                }
            });
            (0, response_1.sendSuccess)(res, { id }, `Transaction ${id} deleted successfully`);
        }
        catch (err) {
            if (err.code === 'P2025') {
                return (0, response_1.sendError)(res, `Transaction with id ${req.params.id} not found`, 404, 'TRANSACTION_NOT_FOUND');
            }
            next(err);
        }
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=transaction.controller.js.map