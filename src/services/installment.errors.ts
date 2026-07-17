// ============================================================
// Typed operational errors for the installment query service
// ------------------------------------------------------------
// Mirrors TransactionError / WalletError: the service throws these instead of
// writing HTTP responses. Each carries the HTTP status, the stable machine code,
// and a safe public message the controller forwards through the existing error
// envelope (`forwardError` recognises it structurally via `isOperational`). They
// are operational (expected, client-safe) — never a place to hide an unexpected
// failure, which must propagate untyped to the central error handler.
//
// The only operational error the read path raises today is an invalid `status`
// filter (400 BAD_REQUEST), preserving the exact status/message/code the old
// controller produced via `sendError(msg, 400)`.
// ============================================================

export class InstallmentError extends Error {
  readonly statusCode: number;
  readonly code: string;
  /** Marks this as a known, client-safe error (as opposed to an unexpected 5xx). */
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'InstallmentError';
    this.statusCode = statusCode;
    this.code = code;
    // Preserve `instanceof` across the transpiled CommonJS target.
    Object.setPrototypeOf(this, InstallmentError.prototype);
  }
}
