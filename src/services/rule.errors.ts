// ============================================================
// Typed operational errors for the rule service
// ------------------------------------------------------------
// Mirrors merchantMapping.errors.ts: the service throws these instead of
// writing HTTP responses; the controller forwards them through the
// standard envelope via forwardError (structural `isOperational` recognition).
// ============================================================

export class RuleError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'RuleError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, RuleError.prototype);
  }
}
