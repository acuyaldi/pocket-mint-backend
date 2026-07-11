"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletReportingEffect = getWalletReportingEffect;
exports.getAggregateCashFlowEffect = getAggregateCashFlowEffect;
const client_1 = require("../generated/prisma/client");
function persistedWalletAmount(transaction) {
    return transaction.type === 'EXPENSE' && transaction.isInstallment && transaction.installment
        ? transaction.installment.grandTotal
        : transaction.amount;
}
function getWalletReportingEffect(transaction, walletId) {
    const amount = persistedWalletAmount(transaction);
    switch (transaction.type) {
        case 'INCOME':
            return transaction.walletId === walletId ? amount : new client_1.Prisma.Decimal(0);
        case 'EXPENSE':
            return transaction.walletId === walletId ? amount.negated() : new client_1.Prisma.Decimal(0);
        case 'TRANSFER':
            if (transaction.walletId === walletId)
                return amount.negated();
            if (transaction.toWalletId === walletId)
                return amount;
            return new client_1.Prisma.Decimal(0);
    }
}
function getAggregateCashFlowEffect(transaction) {
    switch (transaction.type) {
        case 'INCOME': return transaction.amount;
        case 'EXPENSE': return transaction.amount.negated();
        case 'TRANSFER': return new client_1.Prisma.Decimal(0);
    }
}
//# sourceMappingURL=reportingEffect.js.map