// ============================================================
// Typed operational errors for the wallet command service
// ------------------------------------------------------------
// Mirrors TransactionError: the service throws these instead of writing HTTP
// responses. Each carries the HTTP status, the stable machine code, and a safe
// public message the controller forwards through the existing error envelope.
// They are operational (expected, client-safe) — never a place to hide an
// unexpected failure, which must propagate untyped to the central error handler.
// ============================================================

export class WalletError extends Error {
  readonly statusCode: number;
  readonly code: string;
  /** Marks this as a known, client-safe error (as opposed to an unexpected 5xx). */
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'WalletError';
    this.statusCode = statusCode;
    this.code = code;
    // Preserve `instanceof` across the transpiled CommonJS target.
    Object.setPrototypeOf(this, WalletError.prototype);
  }
}
