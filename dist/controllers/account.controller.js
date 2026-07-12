"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletSparkline = exports.deleteWallet = exports.updateWallet = exports.createWallet = exports.getAllWallets = void 0;
const response_1 = require("../utils/response");
const wallet_service_1 = require("../services/wallet.service");
const wallet_query_service_1 = require("../services/wallet-query.service");
const authContext_1 = require("../http/authContext");
const queryParsers_1 = require("../http/queryParsers");
const forwardError_1 = require("../http/forwardError");
const DEBT_TYPES = ['CREDIT_CARD', 'LOAN_PAYLATER'];
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
    return { userId, walletId, force: (0, queryParsers_1.scalarBooleanTrue)(query.force) };
}
/**
 * Serialize the query service's Decimal net-worth totals into the existing
 * numeric response. The reporting snapshot is fetched from the wallet query
 * service (reads) and appended to every mutation response, exactly as before.
 */
function serializeNetWorth(totals) {
    return {
        totalAset: parseFloat(totals.totalAset.toString()),
        totalUtang: parseFloat(totals.totalUtang.toString()),
        netWorth: parseFloat(totals.netWorth.toString()),
    };
}
/** Fetch + serialize the caller's net-worth snapshot (the mutation-response reporting field). */
async function netWorthSnapshot(userId) {
    return serializeNetWorth(await wallet_query_service_1.walletQueryService.getNetWorth({ userId }));
}
/**
 * Serialize one wallet for the list response: Decimal → number (parseFloat, as
 * before) plus the DEBT-only computed fields. `sisa_limit` and `outstanding_debt`
 * are `null` for asset wallets. This is the single response boundary — the query
 * service returns raw Decimals and never converts.
 */
function serializeWallet(w) {
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
}
/** Serialize sparkline points: Decimal → number, preserving pre-creation `null` (never 0). */
function serializeSparkline(points) {
    return points.map((point) => ({
        date: point.date,
        balance: point.balance === null ? null : Number(point.balance.toString()),
    }));
}
/**
 * GET /api/v1/wallets
 * Returns list of wallets for the authenticated user,
 * with computed fields: sisa_limit & outstanding_debt for DEBT wallets.
 */
const getAllWallets = async (req, res, next) => {
    try {
        // Identity comes only from the canonical auth context (set by requireUser).
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const wallets = await wallet_query_service_1.walletQueryService.listWallets({ userId });
        (0, response_1.sendSuccess)(res, wallets.map(serializeWallet), 'Fetched wallets');
    }
    catch (err) {
        (0, forwardError_1.forwardError)(err, res, next);
    }
};
exports.getAllWallets = getAllWallets;
/**
 * POST /api/v1/wallets
 * Create a new wallet for the user.
 */
const createWallet = async (req, res, next) => {
    try {
        // Identity is the authenticated caller only — never the request body/query.
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'userId is required', 400);
        }
        const wallet = await wallet_service_1.walletService.createWallet(mapCreateWalletRequest(req.body, userId));
        // net-worth snapshot (reporting) is appended here; the service owns no response shaping.
        (0, response_1.sendSuccess)(res, { ...wallet, netWorth: await netWorthSnapshot(userId) }, 'Wallet created successfully', 201);
    }
    catch (err) {
        (0, forwardError_1.forwardError)(err, res, next);
    }
};
exports.createWallet = createWallet;
/**
 * PUT /api/v1/wallets/:id
 * Update wallet details.
 */
const updateWallet = async (req, res, next) => {
    try {
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const wallet = await wallet_service_1.walletService.updateWallet(mapUpdateWalletRequest(req.params.id, userId, req.body));
        (0, response_1.sendSuccess)(res, { ...wallet, netWorth: await netWorthSnapshot(wallet.userId) }, 'Wallet updated successfully');
    }
    catch (err) {
        (0, forwardError_1.forwardError)(err, res, next);
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
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const result = await wallet_service_1.walletService.deleteWallet(mapDeleteWalletRequest(req.params.id, userId, req.query));
        // Ownership was verified in the service, so the caller owns the deleted wallet;
        // the reporting snapshot reflects the state after deletion.
        (0, response_1.sendSuccess)(res, { id: result.id, netWorth: await netWorthSnapshot(userId) }, `Wallet ${result.id} deleted successfully`);
    }
    catch (err) {
        (0, forwardError_1.forwardError)(err, res, next);
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
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const points = await wallet_query_service_1.walletQueryService.getWalletSparkline({ userId, walletId: req.params.id });
        (0, response_1.sendSuccess)(res, serializeSparkline(points), 'Sparkline data');
    }
    catch (err) {
        (0, forwardError_1.forwardError)(err, res, next);
    }
};
exports.getWalletSparkline = getWalletSparkline;
//# sourceMappingURL=account.controller.js.map