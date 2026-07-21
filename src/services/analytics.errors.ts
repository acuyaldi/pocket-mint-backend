// ============================================================
// Typed operational errors for the Analytics v2 services
// ------------------------------------------------------------
// Mirrors transaction.errors.ts / budget.errors.ts: services throw these
// instead of writing HTTP responses; forwardError (structural `isOperational`
// recognition) renders them through the standard envelope.
// ============================================================

export class AnalyticsError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AnalyticsError';
    this.statusCode = statusCode;
    this.code = code;
    // Preserve `instanceof` across the transpiled CommonJS target.
    Object.setPrototypeOf(this, AnalyticsError.prototype);
  }
}
