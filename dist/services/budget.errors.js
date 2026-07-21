"use strict";
// ============================================================
// Typed operational errors for the budget query service
// ------------------------------------------------------------
// Mirrors savingGoal.errors.ts / installment.errors.ts: the service throws
// these instead of writing HTTP responses; a future controller forwards them
// through the standard envelope via forwardError (structural `isOperational`
// recognition).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetError = void 0;
class BudgetError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.isOperational = true;
        this.name = 'BudgetError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, BudgetError.prototype);
    }
}
exports.BudgetError = BudgetError;
//# sourceMappingURL=budget.errors.js.map