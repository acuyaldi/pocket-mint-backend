"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtVerificationConfigured = void 0;
exports.verifySupabaseJwt = verifySupabaseJwt;
const jose_1 = require("jose");
const config_1 = require("../config");
/**
 * Supabase JWT verification.
 *
 * Supports both key models Supabase offers:
 *  - Legacy shared HS256 secret        -> SUPABASE_JWT_SECRET
 *  - Modern asymmetric signing keys    -> JWKS derived from SUPABASE_URL
 *
 * All configuration comes from the central `authConfig` (no direct env reads).
 * When neither key source is configured, verification is disabled and callers
 * fall back to the legacy header-based identity path (see `requireUser`).
 */
const { secret, supabaseUrl, audience, issuer } = config_1.authConfig.jwt;
const hsKey = secret ? new TextEncoder().encode(secret) : null;
const jwks = supabaseUrl
    ? (0, jose_1.createRemoteJWKSet)(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
    : null;
/** True when at least one verification key source is configured. */
exports.jwtVerificationConfigured = config_1.authConfig.jwt.configured;
/** `aud` is always checked; `iss` only when configured/derivable. */
const verifyOptions = {
    audience,
    ...(issuer ? { issuer } : {}),
};
/**
 * Verify a Supabase access token and return the authenticated user's id
 * (the `sub` claim, which equals the backend `User.id`). Returns null for any
 * invalid, expired, wrong-audience/issuer, or unverifiable token — never throws.
 */
async function verifySupabaseJwt(token) {
    try {
        let payload;
        if (jwks) {
            ({ payload } = await (0, jose_1.jwtVerify)(token, jwks, verifyOptions));
        }
        else if (hsKey) {
            ({ payload } = await (0, jose_1.jwtVerify)(token, hsKey, verifyOptions));
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