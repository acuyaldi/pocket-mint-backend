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
/** Uniform 401 in the existing `{ error }` shape (preserves current frontend contract). */
function unauthorized(res, message) {
    res.status(401).json({ error: message });
}
/** Inject the resolved, trusted user id for downstream controllers, then continue. */
function injectUser(req, userId, method, next) {
    req.userId = userId;
    req.authMethod = method;
    if (!req.body)
        req.body = {};
    req.body.userId = userId;
    req.query.userId = userId;
    next();
}
/**
 * API-key gate ONLY — does not resolve a user.
 * Used by endpoints that run before the user exists in the backend
 * (e.g. POST /users/sync during signup).
 */
function apiKeyAuth(req, res, next) {
    if (!(0, config_1.verifyApiKey)(headerValue(req.headers['x-api-key']))) {
        return unauthorized(res, 'Invalid or missing API key');
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
 * The resolved id is injected into req.userId / req.body.userId /
 * req.query.userId, overwriting any client-supplied value so downstream
 * controllers can never be handed a spoofed userId.
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
                return unauthorized(res, 'Invalid or expired token');
            }
            const user = await prisma_1.default.user.findUnique({
                where: { id: verifiedUserId },
                select: { id: true },
            });
            if (!user) {
                return unauthorized(res, 'Unknown user');
            }
            return injectUser(req, user.id, 'jwt', next);
        }
        // 2. No bearer token and JWT-only mode → reject.
        if (config_1.authConfig.requireJwt) {
            return unauthorized(res, 'Missing bearer token');
        }
        // 3. DEPRECATED legacy compatibility path: API key + self-asserted identity.
        if (!(0, config_1.verifyApiKey)(headerValue(req.headers['x-api-key']))) {
            return unauthorized(res, 'Invalid or missing API key');
        }
        const headerUserId = headerValue(req.headers['x-user-id']);
        const headerEmail = headerValue(req.headers['x-user-email']);
        if (!headerUserId && !headerEmail) {
            return unauthorized(res, 'Missing user identity (x-user-id header)');
        }
        let user = null;
        if (headerUserId) {
            user = await prisma_1.default.user.findUnique({ where: { id: headerUserId }, select: { id: true } });
        }
        if (!user && headerEmail) {
            user = await prisma_1.default.user.findUnique({ where: { email: headerEmail }, select: { id: true } });
        }
        if (!user) {
            return unauthorized(res, 'Unknown user');
        }
        (0, logger_1.recordLegacyAuthUsage)();
        return injectUser(req, user.id, 'legacy-api-key', next);
    }
    catch (err) {
        console.error('requireUser middleware error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=apiKeyAuth.js.map