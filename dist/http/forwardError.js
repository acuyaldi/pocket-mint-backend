"use strict";
// ============================================================
// Operational-error forwarding (HTTP boundary)
// ------------------------------------------------------------
// One place that decides how a thrown service error becomes an HTTP response.
// A typed *operational* error (TransactionError, WalletError, and anything else
// following the same shape) keeps its exact status + stable code + safe message
// through the standard error envelope. Anything else is unexpected: it is handed
// untouched to the central error handler (`next(err)`), which redacts internals
// and attaches a correlation id. This never manufactures a 500 here.
//
// Recognition is STRUCTURAL (the `isOperational` flag), so this helper does not
// import each domain's error class and unrelated error hierarchies are not merged.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOperationalError = isOperationalError;
exports.forwardError = forwardError;
const response_1 = require("../utils/response");
/** Structural guard: a known, client-safe operational error (never an unexpected 5xx). */
function isOperationalError(err) {
    return (err instanceof Error &&
        err.isOperational === true &&
        typeof err.statusCode === 'number' &&
        typeof err.code === 'string');
}
/**
 * Forward a caught error. Operational errors are rendered through the existing
 * envelope (`sendError`) with their exact status/code/message; everything else
 * propagates to the central error handler unchanged.
 */
function forwardError(err, res, next) {
    if (isOperationalError(err)) {
        (0, response_1.sendError)(res, err.message, err.statusCode, err.code);
        return;
    }
    next(err);
}
//# sourceMappingURL=forwardError.js.map