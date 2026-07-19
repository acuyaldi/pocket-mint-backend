// ============================================================
// Typed operational errors for the notification service
// ------------------------------------------------------------
// Mirrors recurringTransaction.errors.ts.
// ============================================================

export class NotificationError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'NotificationError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, NotificationError.prototype);
  }
}
