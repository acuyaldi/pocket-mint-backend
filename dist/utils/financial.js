"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyWalletForNetWorth = classifyWalletForNetWorth;
exports.calculateNetWorth = calculateNetWorth;
exports.getUserNetWorth = getUserNetWorth;
const client_1 = require("../generated/prisma/client");
const prisma_1 = __importDefault(require("../lib/prisma"));
function classifyWalletForNetWorth(type) {
    switch (type) {
        case 'CASH':
        case 'BANK':
        case 'E_WALLET':
            return 'ASSET';
        case 'CREDIT_CARD':
        case 'LOAN_PAYLATER':
            return 'DEBT';
        default:
            throw new Error(`Unsupported wallet type: ${type}`);
    }
}
/**
 * Menghitung net worth, total aset, dan total utang dari array wallet.
 * Menggunakan Prisma.Decimal untuk presisi finansial.
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
    // Net worth = total aset saja. Utang (paylater/pinjaman) tidak mengurangi
    // net worth — aset baru berkurang saat transaksi pembayaran cicilan terjadi.
    const netWorth = totalAset;
    return {
        totalAset,
        totalUtang,
        netWorth,
    };
}
/**
 * Mengambil data wallet dari database dan menghitung net worth untuk seorang user.
 * Diproteksi dengan filter userId untuk keamanan data.
 */
async function getUserNetWorth(userId) {
    const wallets = await prisma_1.default.wallet.findMany({
        where: { userId },
        select: {
            type: true,
            balance: true,
        },
    });
    return calculateNetWorth(wallets);
}
//# sourceMappingURL=financial.js.map