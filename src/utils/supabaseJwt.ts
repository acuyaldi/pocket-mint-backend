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
 * When neither key source is configured, verification is disabled and every
 * token is rejected — there is no non-JWT identity path to fall back to.
 */

const { secret, supabaseUrl, audience, issuer } = authConfig.jwt;

/** A successfully verified identity: the `sub` claim plus, when present, `email`. */
export interface VerifiedIdentity {
  sub: string;
  email?: string;
}

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
 * Verify a Supabase access token and return the authenticated identity: the
 * `sub` claim (which equals the backend `User.id`) plus the verified `email`
 * claim when present. Returns null for any invalid, expired,
 * wrong-audience/issuer, or unverifiable token — never throws.
 */
export async function verifySupabaseJwt(token: string): Promise<VerifiedIdentity | null> {
  try {
    let payload: JWTPayload;
    if (jwks) {
      ({ payload } = await jwtVerify(token, jwks, verifyOptions));
    } else if (hsKey) {
      ({ payload } = await jwtVerify(token, hsKey, verifyOptions));
    } else {
      return null;
    }
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    const email =
      typeof payload.email === 'string' && payload.email.length > 0 ? payload.email : undefined;
    return { sub: payload.sub, email };
  } catch {
    return null;
  }
}
