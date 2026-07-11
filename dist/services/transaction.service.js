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
const reportingTime_1 = require("../domain/reportingTime");
const installment_1 = require("../domain/installment");
const transactionBalance_1 = require("../domain/transactionBalance");
const transaction_errors_1 = require("./transaction.errors");
const transaction_types_1 = require("./transaction.types");
const VALID_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'];
const CREDIT_WALLET_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];
const VALID_TENORS = [3, 6, 12];
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
    async function createTransaction(input) {
        const { userId, type, toWalletId, categoryId } = input;
        // Resolve walletId: explicit, else the user's first wallet (unchanged default).
        let walletId = input.walletId;
        if (!walletId) {
            const defaultWallet = await db.wallet.findFirst({ where: { userId } });
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
        const wallet = await db.wallet.findFirst({ where: { id: resolvedWalletId, userId } });
        if (!wallet) {
            throw new transaction_errors_1.TransactionError('Wallet tidak ditemukan', 404, 'NOT_FOUND');
        }
        if (type === 'TRANSFER' && toWalletId) {
            const toWallet = await db.wallet.findFirst({ where: { id: toWalletId, userId }, select: { id: true } });
            if (!toWallet) {
                throw new transaction_errors_1.TransactionError('Wallet tujuan tidak ditemukan', 404, 'NOT_FOUND');
            }
        }
        if (categoryId) {
            const category = await db.category.findFirst({ where: { id: categoryId, userId } });
            if (!category) {
                throw new transaction_errors_1.TransactionError('Kategori tidak ditemukan', 404, 'NOT_FOUND');
            }
        }
        try {
            // ─── Installment (Model A: one Installment ↔ one Transaction) ──────────
            if (input.isInstallment) {
                if (!CREDIT_WALLET_TYPES.includes(wallet.type)) {
                    throw new transaction_errors_1.TransactionError('Cicilan hanya tersedia untuk wallet DEBT', 400, 'BAD_REQUEST');
                }
                const { installmentMonths } = input;
                if (!installmentMonths || !VALID_TENORS.includes(installmentMonths)) {
                    throw new transaction_errors_1.TransactionError('Tenor cicilan tidak valid', 400, 'BAD_REQUEST');
                }
                if (type !== 'EXPENSE') {
                    throw new transaction_errors_1.TransactionError('Cicilan hanya tersedia untuk tipe EXPENSE', 400, 'BAD_REQUEST');
                }
                const parsedInterestRate = input.interestRate !== undefined && input.interestRate !== null ? Number(input.interestRate) : 0;
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
                return await db.$transaction(async (tx) => {
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
            return await db.$transaction(async (tx) => {
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
    return { createTransaction };
}
/** Production instance bound to the shared Prisma singleton. */
exports.transactionService = createTransactionService(prisma_1.default);
//# sourceMappingURL=transaction.service.js.map