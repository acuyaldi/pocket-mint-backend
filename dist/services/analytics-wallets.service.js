"use strict";
// ============================================================
// Analytics v2 — wallet breakdown service
// ------------------------------------------------------------
// Per-wallet income/expense/net-cash-flow/transaction-count for every wallet
// the caller owns over the resolved period. Every owned wallet appears even
// with zero activity (matches wallet-query.service.ts's `listWallets`, which
// includes archived wallets with no extra filter). TRANSFER rows are
// excluded from income/expense, same rule as the overview service.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsWalletsService = void 0;
exports.createAnalyticsWalletsService = createAnalyticsWalletsService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const analytics_period_1 = require("./analytics-period");
const ZERO = new client_1.Prisma.Decimal(0);
function createAnalyticsWalletsService(db) {
    async function getWalletBreakdown(input) {
        const resolved = (0, analytics_period_1.resolvePeriodOrThrow)(input);
        const [wallets, sums] = await Promise.all([
            db.wallet.findMany({ where: { userId: input.userId }, select: { id: true, name: true }, orderBy: { createdAt: 'asc' } }),
            db.transaction.groupBy({
                by: ['walletId', 'type'],
                where: { userId: input.userId, type: { in: ['INCOME', 'EXPENSE'] }, date: { gte: resolved.range.startInclusive, lt: resolved.range.endExclusive } },
                _sum: { amount: true },
                _count: { _all: true },
            }),
        ]);
        const byWallet = new Map();
        for (const s of sums) {
            const entry = byWallet.get(s.walletId) ?? { income: ZERO, expense: ZERO, count: 0 };
            const amount = s._sum.amount ?? ZERO;
            if (s.type === 'INCOME')
                entry.income = entry.income.plus(amount);
            else
                entry.expense = entry.expense.plus(amount);
            entry.count += s._count._all;
            byWallet.set(s.walletId, entry);
        }
        const items = wallets.map((w) => {
            const totals = byWallet.get(w.id) ?? { income: ZERO, expense: ZERO, count: 0 };
            return { id: w.id, name: w.name, income: totals.income, expense: totals.expense, netCashFlow: totals.income.minus(totals.expense), transactionCount: totals.count };
        });
        return { period: resolved.period, periodStart: resolved.range.startInclusive, periodEnd: resolved.range.endExclusive, wallets: items };
    }
    return { getWalletBreakdown };
}
/** Production instance bound to the shared Prisma singleton. */
exports.analyticsWalletsService = createAnalyticsWalletsService(prisma_1.default);
//# sourceMappingURL=analytics-wallets.service.js.map