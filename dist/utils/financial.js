"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyWalletForNetWorth = classifyWalletForNetWorth;
exports.calculateNetWorth = calculateNetWorth;
const client_1 = require("../generated/prisma/client");
function classifyWalletForNetWorth(type) {
    switch (type) {
        case 'CASH':
        case 'BANK':
        case 'E_WALLET':
            return 'ASSET';
        case 'CREDIT_CARD':
        case 'PAYLATER':
        case 'LOAN':
            return 'DEBT';
        default:
            throw new Error(`Unsupported wallet type: ${type}`);
    }
}
/**
 * Menghitung net worth, total aset, dan total utang dari array wallet.
 * Menggunakan Prisma.Decimal untuk presisi finansial.
 *
 * PD-001 (Approved): Net Worth = Total Assets − Total Outstanding Debt,
 * evaluated over the same wallet snapshot (one Reporting Cutoff). May be
 * negative; never clamped. Installment debt is already locked into the debt
 * wallet's outstanding balance at creation, so it is counted exactly once
 * here — no separate installment term may be subtracted again.
 */
function calculateNetWorth(wallets) {
    let totalAset = new client_1.Prisma.Decimal(0);
    let totalUtang = new client_1.Prisma.Decimal(0);
    for (const w of wallets) {
        if (classifyWalletForNetWorth(w.type) === 'ASSET') {
            totalAset = totalAset.plus(w.balance);
        }
        else {
            // Outstanding debt = absolute value of the negative balance
            totalUtang = totalUtang.plus(w.balance.abs());
        }
    }
    const netWorth = totalAset.minus(totalUtang);
    return {
        totalAset,
        totalUtang,
        netWorth,
    };
}
//# sourceMappingURL=financial.js.map