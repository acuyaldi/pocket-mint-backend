"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
const transactionBalance_1 = require("../domain/transactionBalance");
const installment_1 = require("../domain/installment");
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
    const m = month ? Math.min(Math.max(parseInt(month, 10) || now.getMonth() + 1, 1), 12) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) || now.getFullYear() : now.getFullYear();
    const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999); // last day of month
    return { startDate, endDate, month: m, year: y };
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
                    date: { gte: startDate, lte: endDate },
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
                    date: { gte: startDate, lte: endDate },
                },
                _sum: { amount: true },
            });
            const sumFor = (t) => {
                const row = sums.find((s) => s.type === t);
                return row?._sum.amount ? parseFloat(row._sum.amount.toString()) : 0;
            };
            const income = sumFor('INCOME');
            const expenses = sumFor('EXPENSE');
            (0, response_1.sendSuccess)(res, {
                income,
                expenses,
                netSavings: income - expenses,
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
            // ---- Inject userId dari middleware ke body ----
            if (req.userId && !req.body.userId) {
                req.body.userId = req.userId;
            }
            const { walletId: bodyWalletId, toWalletId, categoryId, type, amount, description, date, isInstallment, installmentMonths, interestRate, } = req.body;
            // ---- Resolve userId ----
            const userId = req.body.userId ||
                req.userId ||
                req.query.userId;
            if (!userId) {
                return (0, response_1.sendError)(res, 'userId is required (provide in body or use API key auth)', 400);
            }
            // ---- Resolve walletId: body → first wallet milik user ----
            let walletId = bodyWalletId;
            if (!walletId) {
                const defaultWallet = await prisma_1.default.wallet.findFirst({ where: { userId } });
                if (!defaultWallet) {
                    return (0, response_1.sendError)(res, 'No wallet found for this user. Create a wallet first.', 400);
                }
                walletId = defaultWallet.id;
            }
            // ---- Validasi field wajib ----
            if (!type || !VALID_TYPES.includes(type)) {
                return (0, response_1.sendError)(res, `type is required and must be one of: ${VALID_TYPES.join(', ')}`, 400);
            }
            if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
                return (0, response_1.sendError)(res, 'amount is required and must be a positive number', 400);
            }
            if (type === 'TRANSFER' && !toWalletId) {
                return (0, response_1.sendError)(res, 'toWalletId is required for TRANSFER transactions', 400);
            }
            // A transfer must move value between two distinct wallets (Invariant 4).
            if (type === 'TRANSFER' && toWalletId === walletId) {
                return (0, response_1.sendError)(res, 'Wallet asal dan tujuan tidak boleh sama', 400, 'INVALID_TRANSFER');
            }
            let parsedDate = new Date();
            if (date) {
                parsedDate = new Date(date);
                if (isNaN(parsedDate.getTime())) {
                    return (0, response_1.sendError)(res, 'date must be a valid date (e.g. YYYY-MM-DD)', 400);
                }
            }
            const numAmount = Number(amount);
            // ---- Validate wallet exists AND belongs to the caller ----
            const wallet = await prisma_1.default.wallet.findFirst({ where: { id: walletId, userId } });
            if (!wallet) {
                return (0, response_1.sendError)(res, 'Wallet tidak ditemukan', 404);
            }
            // ---- Validate transfer destination belongs to the caller ----
            if (type === 'TRANSFER' && toWalletId) {
                const toWallet = await prisma_1.default.wallet.findFirst({ where: { id: toWalletId, userId }, select: { id: true } });
                if (!toWallet) {
                    return (0, response_1.sendError)(res, 'Wallet tujuan tidak ditemukan', 404);
                }
            }
            // ---- Validate category exists (if provided) AND belongs to the caller ----
            if (categoryId) {
                const category = await prisma_1.default.category.findFirst({ where: { id: categoryId, userId } });
                if (!category) {
                    return (0, response_1.sendError)(res, 'Kategori tidak ditemukan', 404);
                }
            }
            // ─── LAYER 2: Installment transaction ─────────────────────────────
            const wantsInstallment = Boolean(isInstallment);
            if (wantsInstallment) {
                // Pre-validation: wallet must be DEBT type
                const isDebtWallet = CREDIT_WALLET_TYPES.includes(wallet.type);
                if (!isDebtWallet) {
                    return (0, response_1.sendError)(res, 'Cicilan hanya tersedia untuk wallet DEBT', 400);
                }
                // Pre-validation: tenor must be valid
                if (!installmentMonths || !VALID_TENORS.includes(installmentMonths)) {
                    return (0, response_1.sendError)(res, 'Tenor cicilan tidak valid', 400);
                }
                // Type must be EXPENSE for installments
                if (type !== 'EXPENSE') {
                    return (0, response_1.sendError)(res, 'Cicilan hanya tersedia untuk tipe EXPENSE', 400);
                }
                // ---- Validate & parse interest rate ----
                const parsedInterestRate = interestRate !== undefined && interestRate !== null
                    ? Number(interestRate)
                    : 0;
                if (parsedInterestRate < 0) {
                    return (0, response_1.sendError)(res, 'Bunga tidak boleh negatif', 400);
                }
                if (parsedInterestRate > 100) {
                    return (0, response_1.sendError)(res, 'Bunga tidak valid', 400);
                }
                // ---- Interest calculations (Decimal-safe, no floating point) ----
                // grand_total is the source of truth locked on the wallet; monthly_amount
                // is the rounded display value. See src/domain/installment.ts for the
                // scale/rounding and remainder policy.
                const interestRateDecimal = new client_1.Prisma.Decimal(parsedInterestRate);
                const plan = (0, installment_1.computeInstallmentPlan)({
                    principal: new client_1.Prisma.Decimal(numAmount),
                    interestRatePctPerMonth: interestRateDecimal,
                    months: installmentMonths,
                });
                const { totalAmount, totalInterest, grandTotal, monthlyAmount } = plan;
                try {
                    const transaction = await prisma_1.default.$transaction(async (tx) => {
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
                                type: 'EXPENSE',
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
                    return (0, response_1.sendSuccess)(res, serialize(transaction), 'Transaction created successfully', 201);
                }
                catch (txErr) {
                    logger_1.logger.error('installment transaction failed', {
                        message: txErr instanceof Error ? txErr.message : String(txErr),
                    });
                    return (0, response_1.sendError)(res, 'Transaksi gagal', 500);
                }
            }
            // ─── LAYER 1: Regular transaction ──────────────────────────────────
            const amountDecimal = new client_1.Prisma.Decimal(numAmount);
            const destWalletId = type === 'TRANSFER' ? toWalletId : null;
            const transaction = await prisma_1.default.$transaction(async (tx) => {
                const created = await tx.transaction.create({
                    data: {
                        userId,
                        walletId,
                        toWalletId: destWalletId,
                        categoryId: categoryId ?? null,
                        type: type,
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
                await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.computeBalanceEffect)({
                    type: type,
                    amount: amountDecimal,
                    walletId,
                    toWalletId: destWalletId,
                }));
                return created;
            });
            (0, response_1.sendSuccess)(res, serialize(transaction), 'Transaction created successfully', 201);
        }
        catch (err) {
            if (err.code === 'P2003') {
                return (0, response_1.sendError)(res, 'Invalid userId, walletId, toWalletId, or categoryId (related record not found)', 400);
            }
            next(err);
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
                parsedDate = new Date(date);
                if (isNaN(parsedDate.getTime())) {
                    return (0, response_1.sendError)(res, 'date must be a valid date (e.g. YYYY-MM-DD)', 400);
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