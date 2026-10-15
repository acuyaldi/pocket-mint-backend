"use strict";
// ============================================================
// Typed operational errors for the Analytics v2 services
// ------------------------------------------------------------
// Mirrors transaction.errors.ts / budget.errors.ts: services throw these
// instead of writing HTTP responses; forwardError (structural `isOperational`
// recognition) renders them through the standard envelope.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsError = void 0;
class AnalyticsError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.isOperational = true;
        this.name = 'AnalyticsError';
        this.statusCode = statusCode;
        this.code = code;
        // Preserve `instanceof` across the transpiled CommonJS target.
        Object.setPrototypeOf(this, AnalyticsError.prototype);
    }
}
exports.AnalyticsError = AnalyticsError;
//# sourceMappingURL=analytics.errors.js.map