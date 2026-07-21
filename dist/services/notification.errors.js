"use strict";
// ============================================================
// Typed operational errors for the notification service
// ------------------------------------------------------------
// Mirrors recurringTransaction.errors.ts.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationError = void 0;
class NotificationError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.isOperational = true;
        this.name = 'NotificationError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, NotificationError.prototype);
    }
}
exports.NotificationError = NotificationError;
//# sourceMappingURL=notification.errors.js.map