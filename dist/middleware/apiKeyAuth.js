"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
exports.requireUser = requireUser;
const prisma_1 = __importDefault(require("../lib/prisma"));
const supabaseJwt_1 = require("../utils/supabaseJwt");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
/** Normalize a header value that may arrive as string | string[] | undefined. */
function headerValue(v) {
    return Array.isArray(v) ? v[0] : v;
}
/** Extract a Bearer token from an Authorization header, if present. */
function bearerToken(header) {
    if (!header)
        return undefined;
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value.trim() : undefined;
}
/**
 * Uniform 401 for every authentication failure. The external body never reveals
 * WHICH check failed (invalid key vs expired token vs unknown user vs wrong
 * issuer/audience) — that only aids attackers. The specific `reason` is a safe
 * internal code logged server-side; no token, key, or user id is ever logged.
 */
function unauthorized(res, reason) {
    logger_1.logger.warn('authentication failed', { reason });
    res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or missing authentication credentials' },
    });
}
/**
 * Publish the resolved, trusted identity as the canonical `req.auth` context for
 * downstream controllers, then continue.
 *
 * `req.auth` is the single authoritative source (controllers read it via
 * `getAuthenticatedUserId`). The request body and query are intentionally NOT
 * mutated any more — a user id can never be smuggled in or read from them.
 *
 * `req.userId` / `req.authMethod` are retained ONLY as deprecated mirrors for
 * readers not yet migrated to `req.auth` (rate-limit keying, the installment
 * controller); new code must never read them.
 */
function injectUser(req, userId, method, next) {
    req.auth = { userId, method };
    req.userId = userId; // @deprecated mirror — see req.auth
    req.authMethod = method; // @deprecated mirror — see req.auth
    next();
}
/**
 * API-key gate ONLY — does not resolve a user.
 * Used by endpoints that run before the user exists in the backend
 * (e.g. POST /users/sync during signup).
 */
function apiKeyAuth(req, res, next) {
    if (!(0, config_1.verifyApiKey)(headerValue(req.headers['x-api-key']))) {
        return unauthorized(res, 'invalid_api_key');
    }
    next();
}
/**
 * API-key gate + authenticated-user resolution.
 *
 * Authentication decision tree (strict — the order below is the contract):
 *
 *   1. An `Authorization: Bearer <token>` was supplied → treated as a JWT login.
 *        - verify it → success: identity is the verified `sub` claim.
 *        - failure (invalid/expired/unverifiable) → 401. NEVER falls back to
 *          the legacy header path. A bearer token is authoritative; any
 *          `x-user-id` on the same request is ignored.
 *   2. No bearer token and AUTH_REQUIRE_JWT=true → 401 (legacy path disabled).
 *   3. No bearer token and compatibility mode (AUTH_REQUIRE_JWT=false):
 *        DEPRECATED legacy path — validate the shared API key, then resolve the
 *        self-asserted `x-user-id` / `x-user-email` header. This trusts the
 *        caller and exists only so the frontend can migrate to Bearer tokens
 *        without a breaking change. Remove once migration completes.
 *
 * The resolved id is published as the canonical `req.auth` context; the request
 * body and query are never mutated, so downstream controllers can never be
 * handed a spoofed userId (a client-supplied body/query `userId` is ignored).
 *
 * SECURITY: this NEVER falls back to a shared/default user.
 */
async function requireUser(req, res, next) {
    try {
        const token = bearerToken(req.headers.authorization);
        // 1. Bearer token present → JWT login attempt, authoritative, no fallback.
        if (token) {
            const verifiedUserId = await (0, supabaseJwt_1.verifySupabaseJwt)(token);
            if (!verifiedUserId) {
                return unauthorized(res, 'invalid_token');
            }
            const user = await prisma_1.default.user.findUnique({
                where: { id: verifiedUserId },
                select: { id: true },
            });
            if (!user) {
                return unauthorized(res, 'unknown_user');
            }
            return injectUser(req, user.id, 'jwt', next);
        }
        // 2. No bearer token and JWT-only mode → reject.
        if (config_1.authConfig.requireJwt) {
            return unauthorized(res, 'missing_bearer');
        }
        // 3. DEPRECATED legacy compatibility path: API key + self-asserted identity.
        if (!(0, config_1.verifyApiKey)(headerValue(req.headers['x-api-key']))) {
            return unauthorized(res, 'invalid_api_key');
        }
        const headerUserId = headerValue(req.headers['x-user-id']);
        const headerEmail = headerValue(req.headers['x-user-email']);
        if (!headerUserId && !headerEmail) {
            return unauthorized(res, 'missing_identity');
        }
        let user = null;
        if (headerUserId) {
            user = await prisma_1.default.user.findUnique({ where: { id: headerUserId }, select: { id: true } });
        }
        if (!user && headerEmail) {
            user = await prisma_1.default.user.findUnique({ where: { email: headerEmail }, select: { id: true } });
        }
        if (!user) {
            return unauthorized(res, 'unknown_user');
        }
        (0, logger_1.recordLegacyAuthUsage)();
        return injectUser(req, user.id, 'legacy-api-key', next);
    }
    catch (err) {
        // Unexpected failure during auth resolution is an internal error, not an
        // auth decision — hand it to the central handler (generic 500 + safe log).
        logger_1.logger.error('requireUser unexpected error', {
            message: err instanceof Error ? err.message : String(err),
        });
        return next(err);
    }
}
//# sourceMappingURL=apiKeyAuth.js.map