import { SignJWT } from 'jose';

export const SECRET = 'test-jwt-secret-abcdefghijklmnopqrstuvwxyz-0123';
export const API_KEY = 'test-api-key-abcdef123456';
export const ISSUER = 'https://proj.supabase.co/auth/v1';

const key = new TextEncoder().encode(SECRET);

/** Mint an HS256 token signed with the test secret. */
export function mint(claims: Record<string, unknown>, exp: string | number = '1h'): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);
}

/** Standard set of valid Supabase-style claims for user `u1`. */
export const validClaims = { sub: 'u1', aud: 'authenticated', iss: ISSUER } as const;

/**
 * Apply env overrides, deleting any key whose value is `undefined`.
 * process.env survives vi.resetModules(), so callers must set every var they
 * depend on explicitly.
 */
export function applyEnv(env: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}
