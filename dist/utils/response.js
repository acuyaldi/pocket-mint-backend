"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        data,
        message,
    });
};
exports.sendSuccess = sendSuccess;
/** Stable machine-readable code per status; mirrors the central error handler. */
const CODE_BY_STATUS = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
};
/**
 * Send an operational error in the standard envelope. `code` defaults to a
 * stable mapping of the status; pass an explicit one for domain-specific codes.
 * Messages passed here must be safe to expose (no internals/secrets).
 */
const sendError = (res, message = 'Internal Server Error', statusCode = 500, code) => {
    const resolvedCode = code ?? CODE_BY_STATUS[statusCode] ?? (statusCode >= 500 ? 'INTERNAL_ERROR' : 'ERROR');
    res.status(statusCode).json({
        success: false,
        error: { code: resolvedCode, statusCode, message },
    });
};
exports.sendError = sendError;
//# sourceMappingURL=response.js.map