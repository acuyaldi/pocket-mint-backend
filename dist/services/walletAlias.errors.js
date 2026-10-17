"use strict";
// ============================================================
// Typed operational errors for the wallet alias service (Phase 37)
// ------------------------------------------------------------
// Mirrors WalletError/MerchantMappingError: the service throws these
// instead of writing HTTP responses; the controller forwards them through
// the standard envelope via forwardError.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletAliasError = void 0;
class WalletAliasError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.isOperational = true;
        this.name = 'WalletAliasError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, WalletAliasError.prototype);
    }
}
exports.WalletAliasError = WalletAliasError;
//# sourceMappingURL=walletAlias.errors.js.map