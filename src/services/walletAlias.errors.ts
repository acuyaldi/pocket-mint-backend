// ============================================================
// Typed operational errors for the wallet alias service (Phase 37)
// ------------------------------------------------------------
// Mirrors WalletError/MerchantMappingError: the service throws these
// instead of writing HTTP responses; the controller forwards them through
// the standard envelope via forwardError.
// ============================================================

export class WalletAliasError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'WalletAliasError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, WalletAliasError.prototype);
  }
}
