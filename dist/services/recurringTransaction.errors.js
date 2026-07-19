"use strict";
// ============================================================
// Typed operational errors for the recurring transaction template service
// ------------------------------------------------------------
// Mirrors transaction.errors.ts: the service throws these instead of writing
// HTTP responses; the controller forwards them through the standard envelope
// via forwardError (structural `isOperational` recognition).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringTransactionError = void 0;
class RecurringTransactionError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.isOperational = true;
        this.name = 'RecurringTransactionError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, RecurringTransactionError.prototype);
    }
}
exports.RecurringTransactionError = RecurringTransactionError;
//# sourceMappingURL=recurringTransaction.errors.js.map