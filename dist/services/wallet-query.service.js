"use strict";
// ============================================================
// Wallet query service
// ------------------------------------------------------------
// The read counterpart to wallet.service.ts. Owns ownership-scoped wallet reads:
// the wallet listing, the net-worth snapshot, and (below) the seven-day
// sparkline. It has no Express dependency and writes no HTTP responses: it
// returns typed domain records (raw Prisma wallets / Decimal totals) or throws
// typed WalletErrors. It performs NO mutations and opens NO write transactions.
//
// The service *orchestrates*; the pure calculations stay in their domain modules:
// net-worth aggregation is `calculateNetWorth` (utils/financial), reporting-day
// windows come from `getRollingDayRanges` and per-transaction effects from
// `getWalletReportingEffect` (domain/*). Nothing here reimplements them, and no
// server-local calendar arithmetic is used — the reporting timezone is fixed.
//
// Dependency injection mirrors the other services: a narrow read Prisma `Pick` is
// passed to the factory; the default `walletQueryService` binds the shared
// singleton for production.
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletQueryService = void 0;
exports.createWalletQueryService = createWalletQueryService;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
const reportingEffect_1 = require("../domain/reportingEffect");
const financial_1 = require("../utils/financial");
const logger_1 = require("../utils/logger");
const wallet_errors_1 = require("./wallet.errors");
const SPARKLINE_DAYS = 7;
function createWalletQueryService(db) {
    /**
     * List every wallet the caller owns, ordered by creation (oldest first) —
     * ownership-scoped so cross-user wallets are impossible. Returns the raw Prisma
     * wallets with Decimal fields intact; the controller serializes them (parseFloat
     * plus the DEBT-only `sisa_limit`/`outstanding_debt` computed fields). Archived
     * wallets are included exactly as before (no `isArchived` filter).
     */
    async function listWallets(input) {
        return db.wallet.findMany({
            where: { userId: input.userId },
            orderBy: { createdAt: 'asc' },
        });
    }
    /**
     * Net-worth snapshot for the caller, ownership-scoped. Delegates the arithmetic
     * to the shared Decimal-safe `calculateNetWorth` helper (no float summation
     * here), preserving the product rule exactly: `totalAset` = asset balances,
     * `totalUtang` = |debt balances|, `netWorth` = asset total only (debt reported
     * separately, never subtracted). Returns Decimals; the controller serializes.
     */
    async function getNetWorth(input) {
        const wallets = await db.wallet.findMany({
            where: { userId: input.userId },
            select: { type: true, balance: true },
        });
        return (0, financial_1.calculateNetWorth)(wallets);
    }
    /**
     * Seven-day closing-balance sparkline for one owned wallet, oldest to newest.
     *
     * Semantics preserved verbatim from the controller (Sprint 2C): exactly seven
     * reporting-calendar days (today−6 … today) in the `REPORTING_TIMEZONE`; the
     * stored current balance is walked *backwards* through every realized effect so
     * each point is that day's end-of-day close; empty days carry forward; a day
     * that ends before the wallet existed is `null` (never fabricated as 0); and
     * effects dated in the future (after `now`) are reversed out of the current
     * balance so they never inflate a realized close. Both transfer sides are
     * queried (`walletId` OR `toWalletId`); `getWalletReportingEffect` applies the
     * per-type reporting switch (income/expense source, transfer out/in, installment
     * grandTotal) — it is not reimplemented here. A legacy transfer with a null
     * destination affects only its known source side; the destination is never
     * inferred (a safe, metadata-free warning is logged, no repair is attempted).
     */
    async function getWalletSparkline(input) {
        const { userId, walletId } = input;
        // Verify the wallet exists AND belongs to the caller (404 otherwise, same as before).
        const wallet = await db.wallet.findFirst({
            where: { id: walletId, userId },
            select: { id: true, balance: true, createdAt: true },
        });
        if (!wallet) {
            throw new wallet_errors_1.WalletError('Wallet not found', 404, 'NOT_FOUND');
        }
        const now = input.now ?? new Date();
        const buckets = (0, reportingTime_1.getRollingDayRanges)(now, SPARKLINE_DAYS, config_1.reportingConfig.timezone);
        // Every realized transaction that can affect one of the seven day closes.
        const recentTx = await db.transaction.findMany({
            where: {
                userId,
                OR: [{ walletId }, { toWalletId: walletId }],
                date: { gte: buckets[0].startInclusive, lt: buckets[buckets.length - 1].endExclusive },
            },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            select: {
                id: true, type: true, amount: true, walletId: true, toWalletId: true,
                isInstallment: true, date: true, createdAt: true,
                installment: { select: { grandTotal: true } },
            },
        });
        if (recentTx.some((tx) => tx.type === 'TRANSFER' && tx.toWalletId === null)) {
            logger_1.logger.warn('wallet sparkline includes legacy transfer with unknown destination', { walletId });
        }
        let runningBalance = new client_1.Prisma.Decimal(wallet.balance);
        let transactionIndex = 0;
        const newestFirst = [];
        for (let bucketIndex = buckets.length - 1; bucketIndex >= 0; bucketIndex--) {
            const bucket = buckets[bucketIndex];
            const closingBoundary = bucketIndex === buckets.length - 1 ? now : bucket.endExclusive;
            while (transactionIndex < recentTx.length &&
                (bucketIndex === buckets.length - 1
                    ? recentTx[transactionIndex].date.getTime() > closingBoundary.getTime()
                    : recentTx[transactionIndex].date.getTime() >= closingBoundary.getTime())) {
                runningBalance = runningBalance.minus((0, reportingEffect_1.getWalletReportingEffect)(recentTx[transactionIndex], walletId));
                transactionIndex++;
            }
            newestFirst.push({
                date: bucket.label,
                balance: bucket.endExclusive.getTime() <= wallet.createdAt.getTime()
                    ? null
                    : new client_1.Prisma.Decimal(runningBalance),
            });
        }
        return newestFirst.reverse();
    }
    return { listWallets, getNetWorth, getWalletSparkline };
}
/** Production instance bound to the shared Prisma singleton. */
exports.walletQueryService = createWalletQueryService(prisma_1.default);
//# sourceMappingURL=wallet-query.service.js.map