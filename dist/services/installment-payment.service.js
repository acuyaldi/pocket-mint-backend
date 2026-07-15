"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installmentPaymentService = void 0;
exports.createInstallmentPaymentService = createInstallmentPaymentService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
const transactionBalance_1 = require("../domain/transactionBalance");
const installment_errors_1 = require("./installment.errors");
const ALLOWED_SOURCE_TYPES = ['BANK', 'CASH'];
const INSTALLMENT_PAYMENT_INCLUDE = {
    wallet: { select: { id: true, name: true, type: true } },
    toWallet: { select: { id: true, name: true, type: true } },
};
const PAID_INSTALLMENT_INCLUDE = {
    wallet: { select: { id: true, name: true, type: true } },
};
function toDecimal(input) {
    try {
        return new client_1.Prisma.Decimal(input);
    }
    catch {
        throw new installment_errors_1.InstallmentError('amount is required and must be a positive number', 400, 'INVALID_AMOUNT');
    }
}
function createInstallmentPaymentService(db) {
    async function payInstallment(input) {
        const amount = toDecimal(input.amount);
        if (amount.lessThanOrEqualTo(0)) {
            throw new installment_errors_1.InstallmentError('amount is required and must be a positive number', 400, 'INVALID_AMOUNT');
        }
        let parsedDate;
        try {
            parsedDate = (0, reportingTime_1.parseBusinessDate)(input.date, config_1.reportingConfig.timezone);
        }
        catch (error) {
            throw new installment_errors_1.InstallmentError(error instanceof Error ? error.message : 'date must be a valid date', 400, 'BAD_REQUEST');
        }
        const installment = await db.installment.findFirst({
            where: { id: input.installmentId, userId: input.userId },
            include: PAID_INSTALLMENT_INCLUDE,
        });
        if (!installment) {
            throw new installment_errors_1.InstallmentError('Cicilan tidak ditemukan', 404, 'NOT_FOUND');
        }
        if (installment.status !== client_1.InstallmentStatus.ACTIVE) {
            throw new installment_errors_1.InstallmentError('Cicilan tidak aktif', 409, 'CONFLICT');
        }
        if (installment.currentTerm >= installment.installmentMonths) {
            throw new installment_errors_1.InstallmentError('Cicilan sudah lunas', 409, 'CONFLICT');
        }
        if (!amount.equals(installment.monthlyAmount)) {
            throw new installment_errors_1.InstallmentError('Jumlah pembayaran harus sama dengan cicilan bulanan', 400, 'INVALID_AMOUNT');
        }
        const sourceWallet = await db.wallet.findFirst({
            where: { id: input.sourceWalletId, userId: input.userId },
            select: { id: true, name: true, type: true, balance: true },
        });
        if (!sourceWallet) {
            throw new installment_errors_1.InstallmentError('Rekening sumber tidak ditemukan', 404, 'NOT_FOUND');
        }
        if (!ALLOWED_SOURCE_TYPES.includes(sourceWallet.type)) {
            throw new installment_errors_1.InstallmentError('Pembayaran cicilan hanya bisa dari rekening bank atau kas', 400, 'BAD_REQUEST');
        }
        if (sourceWallet.balance.lessThan(amount)) {
            throw new installment_errors_1.InstallmentError('Saldo rekening sumber tidak cukup', 400, 'INSUFFICIENT_FUNDS');
        }
        const nextTerm = installment.currentTerm + 1;
        const nextStatus = nextTerm >= installment.installmentMonths
            ? client_1.InstallmentStatus.SETTLED
            : client_1.InstallmentStatus.ACTIVE;
        return db.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
                data: {
                    userId: input.userId,
                    walletId: input.sourceWalletId,
                    toWalletId: installment.walletId,
                    type: 'TRANSFER',
                    amount,
                    description: `Pembayaran cicilan — ${installment.description || installment.wallet.name}`,
                    date: parsedDate,
                    isInstallment: false,
                },
                include: INSTALLMENT_PAYMENT_INCLUDE,
            });
            await (0, transactionBalance_1.applyBalanceDeltas)(tx, (0, transactionBalance_1.computeBalanceEffect)({
                type: 'TRANSFER',
                amount,
                walletId: input.sourceWalletId,
                toWalletId: installment.walletId,
            }));
            const updated = await tx.installment.update({
                where: { id: installment.id },
                data: {
                    currentTerm: nextTerm,
                    status: nextStatus,
                },
                include: PAID_INSTALLMENT_INCLUDE,
            });
            return { transaction, installment: updated };
        });
    }
    return { payInstallment };
}
exports.installmentPaymentService = createInstallmentPaymentService(prisma_1.default);
//# sourceMappingURL=installment-payment.service.js.map