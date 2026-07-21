// ============================================================
// Typed operational errors for the budget query service
// ------------------------------------------------------------
// Mirrors savingGoal.errors.ts / installment.errors.ts: the service throws
// these instead of writing HTTP responses; a future controller forwards them
// through the standard envelope via forwardError (structural `isOperational`
// recognition).
// ============================================================

export class BudgetError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'BudgetError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, BudgetError.prototype);
  }
}
