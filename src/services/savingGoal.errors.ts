// ============================================================
// Typed operational errors for the saving goal service
// ------------------------------------------------------------
// Mirrors recurringTransaction.errors.ts: the service throws these instead of
// writing HTTP responses; the controller forwards them through the standard
// envelope via forwardError (structural `isOperational` recognition).
// ============================================================

export class SavingGoalError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'SavingGoalError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, SavingGoalError.prototype);
  }
}
