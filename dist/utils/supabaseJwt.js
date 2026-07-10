"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtVerificationConfigured = void 0;
exports.verifySupabaseJwt = verifySupabaseJwt;
const jose_1 = require("jose");
/**
 * Supabase JWT verification.
 *
 * Supports both key models Supabase offers:
 *  - Legacy shared HS256 secret  -> SUPABASE_JWT_SECRET
 *  - Modern asymmetric signing keys (JWKS) -> derived from SUPABASE_URL
 *
 * When neither is configured, verification is disabled and callers fall back
 * to the legacy header-based identity path (see `requireUser`).
 */
const jwtSecret = process.env.SUPABASE_JWT_SECRET?.trim();
const hsKey = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;
const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
const jwks = supabaseUrl
    ? (0, jose_1.createRemoteJWKSet)(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
    : null;
/** True when at least one verification key source is configured. */
exports.jwtVerificationConfigured = Boolean(hsKey || jwks);
/** Supabase user access tokens are issued with this audience. */
const AUDIENCE = 'authenticated';
/**
 * Verify a Supabase access token and return the authenticated user's id
 * (the `sub` claim, which equals the backend `User.id`). Returns null for any
 * invalid, expired, or unverifiable token — never throws.
 */
async function verifySupabaseJwt(token) {
    try {
        let payload;
        if (jwks) {
            ({ payload } = await (0, jose_1.jwtVerify)(token, jwks, { audience: AUDIENCE }));
        }
        else if (hsKey) {
            ({ payload } = await (0, jose_1.jwtVerify)(token, hsKey, { audience: AUDIENCE }));
        }
        else {
            return null;
        }
        return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=supabaseJwt.js.map