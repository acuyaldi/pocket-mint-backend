"use strict";
// ============================================================
// Correlation ID middleware
// ------------------------------------------------------------
// Attaches a correlation ID to every request. Accepts an
// existing safe header only if repo policy allows it (currently:
// generate a fresh ID for every request). The ID is published
// on `req.correlationId` and returned in the response header.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORRELATION_HEADER = void 0;
exports.correlationMiddleware = correlationMiddleware;
const crypto_1 = require("crypto");
exports.CORRELATION_HEADER = 'X-Correlation-Id';
/**
 * Middleware: generate a fresh correlation ID and attach it to the
 * request and response. We deliberately do NOT accept a
 * caller-supplied correlation ID header — every request gets a
 * new, safe ID. This avoids correlation-injection risks and keeps
 * the log chain intact.
 */
function correlationMiddleware(req, res, next) {
    const id = (0, crypto_1.randomUUID)();
    req.correlationId = id;
    res.setHeader(exports.CORRELATION_HEADER, id);
    next();
}
//# sourceMappingURL=correlation.js.map