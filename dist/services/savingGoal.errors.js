"use strict";
// ============================================================
// Typed operational errors for the saving goal service
// ------------------------------------------------------------
// Mirrors recurringTransaction.errors.ts: the service throws these instead of
// writing HTTP responses; the controller forwards them through the standard
// envelope via forwardError (structural `isOperational` recognition).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavingGoalError = void 0;
class SavingGoalError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.isOperational = true;
        this.name = 'SavingGoalError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, SavingGoalError.prototype);
    }
}
exports.SavingGoalError = SavingGoalError;
//# sourceMappingURL=savingGoal.errors.js.map