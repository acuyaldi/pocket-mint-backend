"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = requireUser;
exports.requireVerifiedJwt = requireVerifiedJwt;
const prisma_1 = __importDefault(require("../lib/prisma"));
const supabaseJwt_1 = require("../utils/supabaseJwt");
const logger_1 = require("../utils/logger");
// ============================================================
// Authentication middleware — verified Supabase JWT only.
// ------------------------------------------------------------
// A valid `Authorization: Bearer <supabase-access-token>` is the SOLE way to
// prove identity. There is no shared API key, no `x-user-id` self-assertion, and
// no body/query identity. Every failure returns one uniform 401. The verified
// `sub` claim is published as the canonical `req.auth` context; the request body
// and query are never mutated, so a spoofed userId can never reach a controller.
// ============================================================
/** Extract a Bearer token from an Authorization header, if present. */
function bearerToken(header) {
    if (!header)
        return undefined;
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value.trim() : undefined;
}
/**
 * Uniform 401 for every authentication failure. The external body never reveals
 * WHICH check failed (missing token vs expired vs wrong issuer/audience vs
 * unknown user) — that only aids attackers. The specific `reason` is a safe
 * internal code logged server-side; no token, claim, or user id is ever logged.
 */
function unauthorized(res, reason) {
    logger_1.logger.warn('authentication failed', { reason });
    res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication credentials' },
    });
}
/**
 * Verify the request's Bearer token. Returns the verified `sub`/`email` on
 * success, or a safe internal reason on failure. Does NOT touch the response —
 * the caller decides how to react. A missing bearer and an invalid bearer are
 * distinct internal reasons but map to the same external 401.
 */
async function verifyBearer(req) {
    const token = bearerToken(req.headers.authorization);
    if (!token)
        return { ok: false, reason: 'missing_bearer' };
    const identity = await (0, supabaseJwt_1.verifySupabaseJwt)(token);
    if (!identity)
        return { ok: false, reason: 'invalid_token' };
    return { ok: true, sub: identity.sub, email: identity.email };
}
/**
 * Gate for user-scoped routes: require a verified JWT AND an existing local
 * user row for the verified `sub`. Publishes `req.auth = { userId }`.
 *
 * Decision tree (the order is the contract):
 *   1. No `Authorization: Bearer <token>` → 401 (`missing_bearer`).
 *   2. Token present but invalid/expired/wrong-aud/iss/signature → 401
 *      (`invalid_token`). Never falls back to any other identity source.
 *   3. Verified `sub` has no local user row → 401 (`unknown_user`).
 *   4. Otherwise publish the canonical `req.auth` context and continue.
 *
 * SECURITY: this NEVER falls back to a shared/default user and never reads
 * `x-user-id`, a body/query `userId`, or an API key.
 */
async function requireUser(req, res, next) {
    try {
        const result = await verifyBearer(req);
        if (!result.ok)
            return unauthorized(res, result.reason);
        const user = await prisma_1.default.user.findUnique({
            where: { id: result.sub },
            select: { id: true },
        });
        if (!user)
            return unauthorized(res, 'unknown_user');
        req.auth = { userId: user.id };
        next();
    }
    catch (err) {
        // Unexpected failure during auth resolution is an internal error, not an
        // auth decision — hand it to the central handler (generic 500 + safe log).
        logger_1.logger.error('requireUser unexpected error', {
            message: err instanceof Error ? err.message : String(err),
        });
        next(err);
    }
}
/**
 * Gate for the identity-bootstrap route (`POST /users/sync`): require a verified
 * JWT but do NOT require a pre-existing local user row — this is the endpoint
 * that CREATES that row. Publishes `req.auth = { userId: <verified sub>, email }`
 * so the controller can provision/return exactly the caller's own local user.
 *
 * A verified user can therefore only ever sync themselves; the verified `sub` is
 * the authority and any `supabaseId` in the body is ignored downstream.
 */
async function requireVerifiedJwt(req, res, next) {
    try {
        const result = await verifyBearer(req);
        if (!result.ok)
            return unauthorized(res, result.reason);
        req.auth = { userId: result.sub, email: result.email };
        next();
    }
    catch (err) {
        logger_1.logger.error('requireVerifiedJwt unexpected error', {
            message: err instanceof Error ? err.message : String(err),
        });
        next(err);
    }
}
//# sourceMappingURL=apiKeyAuth.js.map