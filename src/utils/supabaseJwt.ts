import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

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
  ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  : null;

/** True when at least one verification key source is configured. */
export const jwtVerificationConfigured = Boolean(hsKey || jwks);

/** Supabase user access tokens are issued with this audience. */
const AUDIENCE = 'authenticated';

/**
 * Verify a Supabase access token and return the authenticated user's id
 * (the `sub` claim, which equals the backend `User.id`). Returns null for any
 * invalid, expired, or unverifiable token — never throws.
 */
export async function verifySupabaseJwt(token: string): Promise<string | null> {
  try {
    let payload: JWTPayload;
    if (jwks) {
      ({ payload } = await jwtVerify(token, jwks, { audience: AUDIENCE }));
    } else if (hsKey) {
      ({ payload } = await jwtVerify(token, hsKey, { audience: AUDIENCE }));
    } else {
      return null;
    }
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}
