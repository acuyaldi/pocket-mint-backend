// ============================================================
// Typed operational errors for the merchant mapping service
// ------------------------------------------------------------
// Mirrors budget.errors.ts: the service throws these instead of writing
// HTTP responses; the controller forwards them through the standard
// envelope via forwardError (structural `isOperational` recognition).
// ============================================================

export class MerchantMappingError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'MerchantMappingError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, MerchantMappingError.prototype);
  }
}
