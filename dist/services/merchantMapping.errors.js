"use strict";
// ============================================================
// Typed operational errors for the merchant mapping service
// ------------------------------------------------------------
// Mirrors budget.errors.ts: the service throws these instead of writing
// HTTP responses; the controller forwards them through the standard
// envelope via forwardError (structural `isOperational` recognition).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantMappingError = void 0;
class MerchantMappingError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.isOperational = true;
        this.name = 'MerchantMappingError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, MerchantMappingError.prototype);
    }
}
exports.MerchantMappingError = MerchantMappingError;
//# sourceMappingURL=merchantMapping.errors.js.map