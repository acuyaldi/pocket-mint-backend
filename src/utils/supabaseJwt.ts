import { jwtVerify, createRemoteJWKSet, type JWTPayload, type JWTVerifyOptions } from 'jose';
import { authConfig } from '../config';

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

const { secret, supabaseUrl, audience, issuer } = authConfig.jwt;

const hsKey = secret ? new TextEncoder().encode(secret) : null;
const jwks = supabaseUrl
  ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  : null;

/** True when at least one verification key source is configured. */
export const jwtVerificationConfigured = authConfig.jwt.configured;

/** `aud` is always checked; `iss` only when configured/derivable. */
const verifyOptions: JWTVerifyOptions = {
  audience,
  ...(issuer ? { issuer } : {}),
};

/**
 * Verify a Supabase access token and return the authenticated user's id
 * (the `sub` claim, which equals the backend `User.id`). Returns null for any
 * invalid, expired, wrong-audience/issuer, or unverifiable token — never throws.
 */
export async function verifySupabaseJwt(token: string): Promise<string | null> {
  try {
    let payload: JWTPayload;
    if (jwks) {
      ({ payload } = await jwtVerify(token, jwks, verifyOptions));
    } else if (hsKey) {
      ({ payload } = await jwtVerify(token, hsKey, verifyOptions));
    } else {
      return null;
    }
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}
