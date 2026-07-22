"use strict";
// ============================================================
// Typed operational errors for the rule service
// ------------------------------------------------------------
// Mirrors merchantMapping.errors.ts: the service throws these instead of
// writing HTTP responses; the controller forwards them through the
// standard envelope via forwardError (structural `isOperational` recognition).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleError = void 0;
class RuleError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.isOperational = true;
        this.name = 'RuleError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, RuleError.prototype);
    }
}
exports.RuleError = RuleError;
//# sourceMappingURL=rule.errors.js.map