"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
exports.requireUser = requireUser;
const prisma_1 = __importDefault(require("../lib/prisma"));
/** Validate the shared API key. Returns true when it matches the configured key. */
function checkApiKey(req) {
    const apiKey = req.headers['x-api-key'];
    return Boolean(apiKey) && apiKey === process.env.API_KEY;
}
/** Normalize a header value that may arrive as string | string[] | undefined. */
function headerValue(v) {
    return Array.isArray(v) ? v[0] : v;
}
/**
 * API-key gate ONLY — does not resolve a user.
 * Used by endpoints that run before the user exists in the backend
 * (e.g. POST /users/sync during signup).
 */
function apiKeyAuth(req, res, next) {
    if (!checkApiKey(req)) {
        return res.status(401).json({ error: 'Invalid or missing API key' });
    }
    next();
}
/**
 * API-key gate + authenticated-user resolution.
 *
 * Identity is taken from the `x-user-id` header (Supabase UID === backend
 * User.id via /users/sync), falling back to `x-user-email` for legacy users
 * whose backend id predates the Supabase-UID sync. The resolved id is injected
 * into req.userId / req.body.userId / req.query.userId for downstream controllers.
 *
 * SECURITY: this NEVER falls back to a shared/default user. A request without a
 * valid, known user identity is rejected. Previously the middleware resolved the
 * oldest user for every request, so all users saw the same Wallets/Transactions.
 */
async function requireUser(req, res, next) {
    if (!checkApiKey(req)) {
        return res.status(401).json({ error: 'Invalid or missing API key' });
    }
    const headerUserId = headerValue(req.headers['x-user-id']);
    const headerEmail = headerValue(req.headers['x-user-email']);
    if (!headerUserId && !headerEmail) {
        return res.status(401).json({ error: 'Missing user identity (x-user-id header)' });
    }
    try {
        let user = null;
        if (headerUserId) {
            user = await prisma_1.default.user.findUnique({ where: { id: headerUserId }, select: { id: true } });
        }
        if (!user && headerEmail) {
            user = await prisma_1.default.user.findUnique({ where: { email: headerEmail }, select: { id: true } });
        }
        if (!user) {
            return res.status(401).json({ error: 'Unknown user' });
        }
        // Inject the resolved id for downstream controllers. Overwrites any
        // client-supplied userId so it can never be spoofed via body/query.
        req.userId = user.id;
        if (!req.body)
            req.body = {};
        req.body.userId = user.id;
        req.query.userId = user.id;
        next();
    }
    catch (err) {
        console.error('requireUser middleware error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=apiKeyAuth.js.map