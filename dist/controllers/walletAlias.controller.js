"use strict";
// ============================================================
// Wallet alias controller (Phase 37)
// ------------------------------------------------------------
// Thin HTTP mapping: allowlists request fields, calls
// walletAlias.service.ts, and maps the result through the single
// `toWalletAliasDto` serializer. Mirrors merchantMapping.controller.ts's shape.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletAliasController = void 0;
const response_1 = require("../utils/response");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const walletAlias_service_1 = require("../services/walletAlias.service");
/** Canonical WalletAliasDto mapper — the ONLY place an alias is serialized for HTTP. */
function toWalletAliasDto(alias) {
    return {
        id: alias.id,
        walletId: alias.walletId,
        aliasDisplay: alias.aliasDisplay,
        createdAt: alias.createdAt.toISOString(),
    };
}
class WalletAliasController {
    // POST /api/v1/wallets/:walletId/aliases
    static async create(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const created = await walletAlias_service_1.walletAliasService.create({
                userId,
                walletId: req.params.walletId,
                aliasDisplay: req.body.aliasDisplay,
            });
            (0, response_1.sendSuccess)(res, toWalletAliasDto(created), 'Wallet alias created successfully', 201);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // DELETE /api/v1/wallets/:walletId/aliases/:aliasId
    static async remove(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            await walletAlias_service_1.walletAliasService.remove({
                userId,
                walletId: req.params.walletId,
                aliasId: req.params.aliasId,
            });
            (0, response_1.sendSuccess)(res, null, 'Wallet alias deleted successfully');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.WalletAliasController = WalletAliasController;
//# sourceMappingURL=walletAlias.controller.js.map