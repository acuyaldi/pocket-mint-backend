"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletSparkline = exports.deleteWallet = exports.updateWallet = exports.createWallet = exports.getAllWallets = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const response_1 = require("../utils/response");
const financial_1 = require("../utils/financial");
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
const reportingEffect_1 = require("../domain/reportingEffect");
const logger_1 = require("../utils/logger");
const wallet_service_1 = require("../services/wallet.service");
const wallet_errors_1 = require("../services/wallet.errors");
const DEBT_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];
/**
 * Forward a wallet service error. Typed operational WalletErrors keep the
 * existing response envelope (status + stable code + safe message); anything
 * unexpected goes to the central error handler untouched — never a manual 500.
 */
function forwardWalletError(err, res, next) {
    if (err instanceof wallet_errors_1.WalletError) {
        (0, response_1.sendError)(res, err.message, err.statusCode, err.code);
        return;
    }
    next(err);
}
/**
 * Resolve the authoritative user id (HTTP concern). `requireUser` injects
 * `req.userId`, which always wins; the body/query fallbacks preserve the prior
 * create behavior for callers without the middleware. The mapper never reads a
 * body `userId`, so a client cannot inject another user's id when authenticated.
 */
function resolveUserId(req) {
    return req.userId || req.body?.userId || req.query?.userId;
}
/** Map allowlisted create fields from the request body into the service input. */
function mapCreateWalletRequest(body, userId) {
    return {
        userId,
        name: body.name,
        type: body.type,
        balance: body.balance,
        creditLimit: body.creditLimit,
        interestRate: body.interestRate,
        adminFee: body.adminFee,
        adminFeeType: body.adminFeeType,
        icon: body.icon,
        color: body.color,
    };
}
/** Map allowlisted update fields (plus route id + authenticated user) into service input. */
function mapUpdateWalletRequest(walletId, userId, body) {
    return {
        userId,
        walletId,
        name: body.name,
        type: body.type,
        balance: body.balance,
        creditLimit: body.creditLimit,
        interestRate: body.interestRate,
        adminFee: body.adminFee,
        adminFeeType: body.adminFeeType,
        icon: body.icon,
        color: body.color,
        isArchived: body.isArchived,
    };
}
/**
 * Map the delete request into service input. `force` is normalized exactly as
 * before: active only when the query string is literally `'true'`.
 */
function mapDeleteWalletRequest(walletId, userId, query) {
    return { userId, walletId, force: query.force === 'true' };
}
/** Serialized net worth snapshot, recomputed after every wallet mutation. */
async function netWorthSnapshot(userId) {
    const { totalAset, totalUtang, netWorth } = await (0, financial_1.getUserNetWorth)(userId);
    return {
        totalAset: parseFloat(totalAset.toString()),
        totalUtang: parseFloat(totalUtang.toString()),
        netWorth: parseFloat(netWorth.toString()),
    };
}
/**
 * GET /api/v1/wallets
 * Returns list of wallets for the authenticated user,
 * with computed fields: sisa_limit & outstanding_debt for DEBT wallets.
 */
const getAllWallets = async (req, res, next) => {
    try {
        // userId disuntik oleh requireUser — jangan hardcode, create/list harus user yang sama
        const userId = req.userId;
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const wallets = await prisma_1.default.wallet.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
        const serialized = wallets.map((w) => {
            const balance = parseFloat(w.balance.toString());
            const creditLimit = parseFloat(w.creditLimit.toString());
            const isDebt = DEBT_TYPES.includes(w.type);
            return {
                ...w,
                balance,
                creditLimit,
                initialBalance: parseFloat(w.initialBalance.toString()),
                interestRate: parseFloat(w.interestRate.toString()),
                adminFee: parseFloat(w.adminFee.toString()),
                // Computed fields for DEBT wallets
                sisa_limit: isDebt ? creditLimit + balance : null,
                outstanding_debt: isDebt ? Math.abs(balance) : null,
            };
        });
        (0, response_1.sendSuccess)(res, serialized, 'Fetched wallets');
    }
    catch (err) {
        next(err);
    }
};
exports.getAllWallets = getAllWallets;
/**
 * POST /api/v1/wallets
 * Create a new wallet for the user.
 */
const createWallet = async (req, res, next) => {
    try {
        const userId = resolveUserId(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'userId is required', 400);
        }
        const wallet = await wallet_service_1.walletService.createWallet(mapCreateWalletRequest(req.body, userId));
        // net-worth snapshot (reporting) is appended here; the service owns no response shaping.
        (0, response_1.sendSuccess)(res, { ...wallet, netWorth: await netWorthSnapshot(userId) }, 'Wallet created successfully', 201);
    }
    catch (err) {
        forwardWalletError(err, res, next);
    }
};
exports.createWallet = createWallet;
/**
 * PUT /api/v1/wallets/:id
 * Update wallet details.
 */
const updateWallet = async (req, res, next) => {
    try {
        const userId = req.userId;
        const wallet = await wallet_service_1.walletService.updateWallet(mapUpdateWalletRequest(req.params.id, userId, req.body));
        (0, response_1.sendSuccess)(res, { ...wallet, netWorth: await netWorthSnapshot(wallet.userId) }, 'Wallet updated successfully');
    }
    catch (err) {
        forwardWalletError(err, res, next);
    }
};
exports.updateWallet = updateWallet;
/**
 * DELETE /api/v1/wallets/:id
 * Hard delete with transaction check: refuses when the wallet has transaction
 * history unless ?force=true (frontend confirm modal sends force).
 */
const deleteWallet = async (req, res, next) => {
    try {
        const userId = req.userId;
        const result = await wallet_service_1.walletService.deleteWallet(mapDeleteWalletRequest(req.params.id, userId, req.query));
        // Ownership was verified in the service, so the caller owns the deleted wallet;
        // the reporting snapshot reflects the state after deletion.
        (0, response_1.sendSuccess)(res, { id: result.id, netWorth: await netWorthSnapshot(userId) }, `Wallet ${result.id} deleted successfully`);
    }
    catch (err) {
        forwardWalletError(err, res, next);
    }
};
exports.deleteWallet = deleteWallet;
/**
 * GET /api/v1/wallets/:id/sparkline
 * Returns up to 7 historical balance data points for a wallet.
 * Used to render mini sparkline charts on dashboard wallet cards.
 */
const getWalletSparkline = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        // Verify wallet exists AND belongs to the caller
        const wallet = await prisma_1.default.wallet.findFirst({
            where: { id, userId },
            select: { id: true, balance: true, createdAt: true },
        });
        if (!wallet) {
            return (0, response_1.sendError)(res, 'Wallet not found', 404);
        }
        const now = new Date();
        const buckets = (0, reportingTime_1.getRollingDayRanges)(now, 7, config_1.reportingConfig.timezone);
        // Every realized transaction that can affect one of the seven day closes.
        const recentTx = await prisma_1.default.transaction.findMany({
            where: {
                userId,
                OR: [{ walletId: id }, { toWalletId: id }],
                date: { gte: buckets[0].startInclusive, lt: buckets[6].endExclusive },
            },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            select: {
                id: true, type: true, amount: true, walletId: true, toWalletId: true,
                isInstallment: true, date: true, createdAt: true,
                installment: { select: { grandTotal: true } },
            },
        });
        if (recentTx.some((tx) => tx.type === 'TRANSFER' && tx.toWalletId === null)) {
            logger_1.logger.warn('wallet sparkline includes legacy transfer with unknown destination', { walletId: id });
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
                runningBalance = runningBalance.minus((0, reportingEffect_1.getWalletReportingEffect)(recentTx[transactionIndex], id));
                transactionIndex++;
            }
            newestFirst.push({
                date: bucket.label,
                balance: bucket.endExclusive.getTime() <= wallet.createdAt.getTime()
                    ? null
                    : Number(runningBalance.toString()),
            });
        }
        const points = newestFirst.reverse();
        (0, response_1.sendSuccess)(res, points, 'Sparkline data');
    }
    catch (err) {
        next(err);
    }
};
exports.getWalletSparkline = getWalletSparkline;
//# sourceMappingURL=account.controller.js.map