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
const billingCycle_1 = require("../domain/billingCycle");
const transactionBalance_1 = require("../domain/transactionBalance");
const installment_errors_1 = require("./installment.errors");
const ALLOWED_SOURCE_TYPES = ['BANK', 'CASH', 'E_WALLET'];
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
        if (installment.paidTerms >= installment.installmentMonths) {
            throw new installment_errors_1.InstallmentError('Tagihan sudah lunas', 409, 'CONFLICT');
        }
        const amount = input.amount === undefined ? installment.monthlyAmount : toDecimal(input.amount);
        if (amount.lessThanOrEqualTo(0)) {
            throw new installment_errors_1.InstallmentError('amount is required and must be a positive number', 400, 'INVALID_AMOUNT');
        }
        if (!amount.equals(installment.monthlyAmount)) {
            throw new installment_errors_1.InstallmentError('Jumlah pembayaran harus sama dengan nominal termin', 400, 'INVALID_AMOUNT');
        }
        const sourceWallet = await db.wallet.findFirst({
            where: { id: input.sourceWalletId, userId: input.userId },
            select: { id: true, name: true, type: true, balance: true },
        });
        if (!sourceWallet) {
            throw new installment_errors_1.InstallmentError('Rekening sumber tidak ditemukan', 404, 'NOT_FOUND');
        }
        if (!ALLOWED_SOURCE_TYPES.includes(sourceWallet.type)) {
            throw new installment_errors_1.InstallmentError('Pembayaran tagihan hanya bisa dari kas, bank, atau e-wallet', 400, 'BAD_REQUEST');
        }
        if (sourceWallet.balance.lessThan(amount)) {
            throw new installment_errors_1.InstallmentError('Saldo rekening sumber tidak cukup', 400, 'INSUFFICIENT_FUNDS');
        }
        const nextPaidTerms = installment.paidTerms + 1;
        const nextTerm = Math.min(nextPaidTerms + 1, installment.installmentMonths);
        const nextStatus = nextPaidTerms >= installment.installmentMonths
            ? client_1.InstallmentStatus.SETTLED
            : client_1.InstallmentStatus.ACTIVE;
        const nextDueDate = nextStatus === client_1.InstallmentStatus.SETTLED
            ? installment.nextDueDate
            : (0, reportingTime_1.parseBusinessDate)((0, billingCycle_1.addBillingMonth)((0, reportingTime_1.formatReportingDate)(installment.nextDueDate, config_1.reportingConfig.timezone), 1), config_1.reportingConfig.timezone);
        return db.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
                data: {
                    userId: input.userId,
                    walletId: input.sourceWalletId,
                    toWalletId: installment.walletId,
                    type: 'TRANSFER',
                    amount,
                    description: `Pembayaran tagihan — ${installment.description || installment.wallet.name}`,
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
                    paidTerms: nextPaidTerms,
                    nextDueDate,
                    status: nextStatus,
                },
                include: PAID_INSTALLMENT_INCLUDE,
            });
            return { transaction, installment: updated };
        });
    }
    return { payInstallment, payBill: payInstallment };
}
exports.installmentPaymentService = createInstallmentPaymentService(prisma_1.default);
//# sourceMappingURL=installment-payment.service.js.map