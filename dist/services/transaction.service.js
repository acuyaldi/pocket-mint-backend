"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionService = void 0;
exports.createTransactionService = createTransactionService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const config_1 = require("../config");
const financial_1 = require("../utils/financial");
const reportingTime_1 = require("../domain/reportingTime");
const installment_1 = require("../domain/installment");
const billingCycle_1 = require("../domain/billingCycle");
const transactionBalance_1 = require("../domain/transactionBalance");
const transaction_errors_1 = require("./transaction.errors");
const transaction_types_1 = require("./transaction.types");
const VALID_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'];
const CREDIT_WALLET_TYPES = ['CREDIT_CARD', 'PAYLATER'];
const TRANSFER_SOURCE_TYPES = ['CASH', 'BANK', 'E_WALLET'];
/** Map a Prisma FK violation to the same 400 the controller used to return. */
function rethrowCreate(err) {
    if (err instanceof transaction_errors_1.TransactionError)
        throw err;
    if (err.code === 'P2003') {
        throw new transaction_errors_1.TransactionError('Invalid userId, walletId, toWalletId, or categoryId (related record not found)', 400, 'BAD_REQUEST');
    }
    throw err;
}
function createTransactionService(db) {
    /**
     * Create a regular or installment transaction. Preserves the original order:
     * resolve wallet → validate type/amount/transfer → parse date → verify wallet,
     * destination, and category ownership → (installment branch or) atomic write.
     */
    async function createTransaction(input, options = {}) {
        const client = options.transaction ?? db;
        const inTransaction = (work) => options.transaction ? work(client) : db.$transaction((tx) => work(tx));
        const { userId, type, toWalletId, categoryId } = input;
        // Resolve walletId: explicit, else the user's first wallet (unchanged default).
        let walletId = input.walletId;
        if (!walletId) {
            const defaultWallet = await client.wallet.findFirst({ where: { userId } });
            if (!defaultWallet) {
                throw new transaction_errors_1.TransactionError('No wallet found for this user. Create a wallet first.', 400, 'BAD_REQUEST');
            }
            walletId = defaultWallet.id;
        }
        const resolvedWalletId = walletId;
        if (!type || !VALID_TYPES.includes(type)) {
            throw new transaction_errors_1.TransactionError(`type is required and must be one of: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
        }
        const { amount } = input;
        if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new transaction_errors_1.TransactionError('amount is required and must be a positive number', 400, 'BAD_REQUEST');
        }
        if (type === 'TRANSFER' && !toWalletId) {
            throw new transaction_errors_1.TransactionError('toWalletId is required for TRANSFER transactions', 400, 'BAD_REQUEST');
        }
        if (type === 'TRANSFER' && toWalletId === resolvedWalletId) {
            throw new transaction_errors_1.TransactionError('Wallet asal dan tujuan tidak boleh sama', 400, 'INVALID_TRANSFER');
        }
        let parsedDate;
        try {
            parsedDate = (0, reportingTime_1.parseBusinessDate)(input.date, config_1.reportingConfig.timezone);
        }
        catch (error) {
            throw new transaction_errors_1.TransactionError(error instanceof Error ? error.message : 'date must be a valid date', 400, 'BAD_REQUEST');
        }
        const numAmount = Number(amount);
        const wallet = await client.wallet.findFirst({ where: { id: resolvedWalletId, userId } });
        if (!wallet) {
            throw new transaction_errors_1.TransactionError('Wallet tidak ditemukan', 404, 'NOT_FOUND');
        }
        if (type === 'TRANSFER') {
            if (!TRANSFER_SOURCE_TYPES.includes(wallet.type)) {
                throw new transaction_errors_1.TransactionError('Sumber transfer harus Kas, Bank, atau E-Wallet', 400, 'INVALID_TRANSFER');
            }
            const sourceBalance = new client_1.Prisma.Decimal(wallet.balance ?? 0);
            if (sourceBalance.lessThan(numAmount)) {
                throw new transaction_errors_1.TransactionError('Saldo sumber tidak mencukupi', 400, 'INSUFFICIENT_FUNDS');
            }
        }
        if (type === 'TRANSFER' && toWalletId) {
            const toWallet = await client.wallet.findFirst({ where: { id: toWalletId, userId }, select: { id: true } });
            if (!toWallet) {
                throw new transaction_errors_1.TransactionError('Wallet tujuan tidak ditemukan', 404, 'NOT_FOUND');
            }
        }
        if (type === 'TRANSFER' && categoryId) {
            throw new transaction_errors_1.TransactionError('Transfer tidak menggunakan kategori', 400, 'BAD_REQUEST');
        }
        if (type !== 'TRANSFER' && !categoryId) {
            throw new transaction_errors_1.TransactionError('categoryId wajib diisi untuk pemasukan dan pengeluaran', 400, 'BAD_REQUEST');
        }
        if (categoryId) {
            const category = await client.category.findFirst({ where: { id: categoryId, userId } });
            if (!category) {
                throw new transaction_errors_1.TransactionError('Kategori tidak ditemukan', 404, 'NOT_FOUND');
            }
            if (category.type !== type) {
                throw new transaction_errors_1.TransactionError('Tipe kategori tidak sesuai dengan tipe transaksi', 400, 'BAD_REQUEST');
            }
        }
        const isCreditExpense = type === 'EXPENSE' && CREDIT_WALLET_TYPES.includes(wallet.type);
        if (type === 'EXPENSE' && wallet.type === 'LOAN') {
            throw new transaction_errors_1.TransactionError('Pinjaman tidak dapat digunakan sebagai sumber pengeluaran', 400, 'BAD_REQUEST');
        }
        if (type === 'INCOME' && (0, financial_1.classifyWalletForNetWorth)(wallet.type) === 'DEBT') {
            throw new transaction_errors_1.TransactionError('Pemasukan tidak bisa dicatat ke wallet utang (kartu kredit, paylater, atau pinjaman)', 400, 'BAD_REQUEST');
        }
        if (input.billingMode !== undefined && !isCreditExpense) {
            throw new transaction_errors_1.TransactionError('Mode tagihan hanya tersedia untuk kartu kredit dan paylater', 400, 'BAD_REQUEST');
        }
        try {
            // ─── Installment (Model A: one Installment ↔ one Transaction) ──────────
            if (isCreditExpense) {
                const billingMode = input.billingMode ?? (input.isInstallment ? 'INSTALLMENT' : 'FULL');
                const installmentMonths = billingMode === 'FULL' ? 1 : input.installmentMonths;
                if (!installmentMonths || !Number.isInteger(installmentMonths) || installmentMonths < 1 || installmentMonths > 120) {
                    throw new transaction_errors_1.TransactionError('Tenor tagihan tidak valid', 400, 'BAD_REQUEST');
                }
                if (billingMode === 'INSTALLMENT' && installmentMonths < 2) {
                    throw new transaction_errors_1.TransactionError('Cicilan harus memiliki minimal 2 termin', 400, 'BAD_REQUEST');
                }
                const parsedInterestRate = billingMode === 'INSTALLMENT' && input.interestRate !== undefined && input.interestRate !== null
                    ? Number(input.interestRate)
                    : 0;
                if (parsedInterestRate < 0)
                    throw new transaction_errors_1.TransactionError('Bunga tidak boleh negatif', 400, 'BAD_REQUEST');
                if (parsedInterestRate > 100)
                    throw new transaction_errors_1.TransactionError('Bunga tidak valid', 400, 'BAD_REQUEST');
                const interestRateDecimal = new client_1.Prisma.Decimal(parsedInterestRate);
                const { totalAmount, totalInterest, grandTotal, monthlyAmount } = (0, installment_1.computeInstallmentPlan)({
                    principal: new client_1.Prisma.Decimal(numAmount),
                    interestRatePctPerMonth: interestRateDecimal,
                    months: installmentMonths,
                });
                let firstDueDate;
                if (wallet.cutoffDay && wallet.paymentDueDay) {
                    firstDueDate = (0, billingCycle_1.calculateFirstDueDate)({
                        transactionDate: (0, reportingTime_1.formatReportingDate)(parsedDate, config_1.reportingConfig.timezone),
                        cutoffDay: wallet.cutoffDay,
                        paymentDueDay: wallet.paymentDueDay,
                        timeZone: 'Asia/Jakarta',
                    });
                }
                else if (input.firstDueDate) {
                    firstDueDate = input.firstDueDate;
                }
                else {
                    throw new transaction_errors_1.TransactionError('firstDueDate wajib diisi jika cutoff atau tanggal jatuh tempo belum diatur', 400, 'BAD_REQUEST');
                }
                let nextDueDate;
                try {
                    nextDueDate = (0, reportingTime_1.parseBusinessDate)(firstDueDate, config_1.reportingConfig.timezone);
                }
                catch (error) {
                    throw new transaction_errors_1.TransactionError(error instanceof Error ? error.message : 'firstDueDate tidak valid', 400, 'BAD_REQUEST');
                }
                const balance = new client_1.Prisma.Decimal(wallet.balance ?? 0);
                const limit = new client_1.Prisma.Decimal(wallet.creditLimit ?? 0);
                const outstanding = balance.isNegative() ? balance.abs() : new client_1.Prisma.Decimal(0);
                const remainingCredit = client_1.Prisma.Decimal.max(limit.minus(outstanding), 0);
                if (grandTotal.greaterThan(remainingCredit)) {
                    throw new transaction_errors_1.TransactionError('Limit kredit tidak mencukupi', 400, 'INSUFFICIENT_CREDIT');
                }
                return await inTransaction(async (tx) => {
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
                            kind: billingMode,
                            paidTerms: 0,
                            nextDueDate,
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
                        include: transaction_types_1.TRANSACTION_INCLUDE,
                    });
                    // Deduct the full debt (grandTotal), locked on the wallet at create.
                    await tx.wallet.update({ where: { id: resolvedWalletId }, data: { balance: { decrement: grandTotal } } });
                    await tx.installment.update({ where: { id: installment.id }, data: { balanceDeducted: true } });
                    return created;
                });
            }
            // ─── Regular transaction ──────────────────────────────────────────────
            const amountDecimal = new client_1.Prisma.Decimal(numAmount);
            const destWalletId = type === 'TRANSFER' ? toWalletId : null;
            return await inTransaction(async (tx) => {
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
                    include: transaction_types_1.TRANSACTION_INCLUDE,
                });
                // One source of truth for the balance effect → reversible on update/delete.
                await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.computeBalanceEffect)({
                    type: type,
                    amount: amountDecimal,
                    walletId: resolvedWalletId,
                    toWalletId: destWalletId,
                }));
                return created;
            });
        }
        catch (err) {
            rethrowCreate(err);
        }
    }
    /**
     * Update a transaction with reverse-then-apply semantics: reverse the persisted
     * original effect, update the row, apply the new effect — atomically. Reversal
     * derives from the stored row, never from request data. Installment rows and
     * legacy (destination-less) transfers are refused rather than re-balanced.
     */
    async function updateTransaction(input) {
        const { userId, id, type, amount, description, date, categoryId, walletId, toWalletId } = input;
        if (type && !VALID_TYPES.includes(type)) {
            throw new transaction_errors_1.TransactionError(`Invalid type. Allowed: ${VALID_TYPES.join(', ')}`, 400, 'BAD_REQUEST');
        }
        if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
            throw new transaction_errors_1.TransactionError('amount must be a positive number', 400, 'INVALID_AMOUNT');
        }
        let parsedDate;
        if (date) {
            try {
                parsedDate = (0, reportingTime_1.parseBusinessDate)(date, config_1.reportingConfig.timezone);
            }
            catch (error) {
                throw new transaction_errors_1.TransactionError(error instanceof Error ? error.message : 'date must be a valid date', 400, 'BAD_REQUEST');
            }
        }
        const existing = await db.transaction.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new transaction_errors_1.TransactionError(`Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
        }
        // Installments are managed as a unit; editing the generated row would desync
        // grandTotal vs. the stored monthly amount.
        if (existing.isInstallment) {
            throw new transaction_errors_1.TransactionError('Transaksi cicilan tidak bisa diubah langsung', 409, 'CONFLICT');
        }
        if (input.isInstallment === true) {
            throw new transaction_errors_1.TransactionError('Tidak bisa mengubah transaksi biasa menjadi cicilan', 400, 'BAD_REQUEST');
        }
        // A legacy transfer has no destination to re-balance — refuse rather than drift.
        if (existing.type === 'TRANSFER' && !existing.toWalletId) {
            throw new transaction_errors_1.TransactionError('Transfer lama tidak bisa diubah; hapus lalu buat ulang', 409, 'CONFLICT');
        }
        const newType = (type ?? existing.type);
        const newAmount = amount !== undefined ? new client_1.Prisma.Decimal(Number(amount)) : existing.amount;
        const newWalletId = walletId ?? existing.walletId;
        const newToWalletId = newType === 'TRANSFER' ? (toWalletId ?? existing.toWalletId ?? null) : null;
        // Fetch the target wallet whenever it might change (explicit walletId) or its
        // type needs checking (type flips to INCOME, even onto the unchanged wallet).
        if (newType !== 'TRANSFER' && (walletId || newType === 'INCOME')) {
            const targetWallet = await db.wallet.findFirst({ where: { id: newWalletId, userId }, select: { id: true, type: true } });
            if (!targetWallet) {
                throw new transaction_errors_1.TransactionError('Wallet tidak ditemukan', 404, 'WALLET_NOT_FOUND');
            }
            if (newType === 'INCOME' && (0, financial_1.classifyWalletForNetWorth)(targetWallet.type) === 'DEBT') {
                throw new transaction_errors_1.TransactionError('Pemasukan tidak bisa dicatat ke wallet utang (kartu kredit, paylater, atau pinjaman)', 400, 'BAD_REQUEST');
            }
        }
        if (newType === 'TRANSFER') {
            if (!newToWalletId) {
                throw new transaction_errors_1.TransactionError('toWalletId is required for TRANSFER transactions', 400, 'INVALID_TRANSFER');
            }
            if (newToWalletId === newWalletId) {
                throw new transaction_errors_1.TransactionError('Wallet asal dan tujuan tidak boleh sama', 400, 'INVALID_TRANSFER');
            }
            const sourceWallet = await db.wallet.findFirst({
                where: { id: newWalletId, userId },
                select: { id: true, type: true, balance: true },
            });
            if (!sourceWallet) {
                throw new transaction_errors_1.TransactionError('Wallet tidak ditemukan', 404, 'WALLET_NOT_FOUND');
            }
            if (!TRANSFER_SOURCE_TYPES.includes(sourceWallet.type)) {
                throw new transaction_errors_1.TransactionError('Sumber transfer harus Kas, Bank, atau E-Wallet', 400, 'INVALID_TRANSFER');
            }
            if (sourceWallet.balance.lessThan(newAmount)) {
                throw new transaction_errors_1.TransactionError('Saldo sumber tidak mencukupi', 400, 'INSUFFICIENT_FUNDS');
            }
            const destWallet = await db.wallet.findFirst({ where: { id: newToWalletId, userId }, select: { id: true } });
            if (!destWallet) {
                throw new transaction_errors_1.TransactionError('Wallet tujuan tidak ditemukan', 404, 'WALLET_NOT_FOUND');
            }
        }
        if (newType === 'TRANSFER' && categoryId) {
            throw new transaction_errors_1.TransactionError('Transfer tidak menggunakan kategori', 400, 'BAD_REQUEST');
        }
        if (newType !== 'TRANSFER' && categoryId !== undefined && !categoryId) {
            throw new transaction_errors_1.TransactionError('categoryId wajib diisi untuk pemasukan dan pengeluaran', 400, 'BAD_REQUEST');
        }
        // Same ownership and type invariant as create.
        if (categoryId) {
            const category = await db.category.findFirst({ where: { id: categoryId, userId } });
            if (!category) {
                throw new transaction_errors_1.TransactionError('Kategori tidak ditemukan', 404, 'NOT_FOUND');
            }
            if (category.type !== newType) {
                throw new transaction_errors_1.TransactionError('Tipe kategori tidak sesuai dengan tipe transaksi', 400, 'BAD_REQUEST');
            }
        }
        try {
            return await db.$transaction(async (tx) => {
                // 1. Reverse the ORIGINAL effect from the persisted row.
                await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.reverseBalanceEffect)({
                    type: existing.type,
                    amount: existing.amount,
                    walletId: existing.walletId,
                    toWalletId: existing.toWalletId,
                }));
                // 2. Update the row.
                const updated = await tx.transaction.update({
                    where: { id },
                    data: {
                        ...(type !== undefined && { type }),
                        ...(amount !== undefined && { amount: newAmount }),
                        ...(description !== undefined && { description }),
                        ...(parsedDate && { date: parsedDate }),
                        ...(newType === 'TRANSFER'
                            ? { categoryId: null }
                            : categoryId !== undefined && { categoryId }),
                        ...(walletId !== undefined && { walletId }),
                        toWalletId: newToWalletId,
                    },
                    include: transaction_types_1.TRANSACTION_INCLUDE,
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
        }
        catch (err) {
            if (err instanceof transaction_errors_1.TransactionError)
                throw err;
            if (err.code === 'P2025') {
                throw new transaction_errors_1.TransactionError(`Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
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
    async function deleteTransaction(input) {
        const { userId, id } = input;
        const existing = await db.transaction.findFirst({
            where: { id, userId },
            include: { installment: { select: { id: true, grandTotal: true } } },
        });
        if (!existing) {
            throw new transaction_errors_1.TransactionError(`Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
        }
        if (existing.type === 'TRANSFER' && !existing.toWalletId) {
            throw new transaction_errors_1.TransactionError('Transfer lama tidak bisa dihapus otomatis; sesuaikan saldo manual', 409, 'CONFLICT');
        }
        try {
            await db.$transaction(async (tx) => {
                if (existing.isInstallment) {
                    await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.reverseBalanceEffect)({
                        type: 'EXPENSE',
                        amount: existing.amount,
                        walletId: existing.walletId,
                        isInstallment: true,
                        installmentGrandTotal: existing.installment?.grandTotal ?? existing.amount,
                    }));
                    await tx.transaction.delete({ where: { id } });
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
            return { id };
        }
        catch (err) {
            if (err instanceof transaction_errors_1.TransactionError)
                throw err;
            if (err.code === 'P2025') {
                throw new transaction_errors_1.TransactionError(`Transaction with id ${id} not found`, 404, 'TRANSACTION_NOT_FOUND');
            }
            throw err;
        }
    }
    return { createTransaction, updateTransaction, deleteTransaction };
}
/** Production instance bound to the shared Prisma singleton. */
exports.transactionService = createTransactionService(prisma_1.default);
//# sourceMappingURL=transaction.service.js.map