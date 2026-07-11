import 'dotenv/config';
import { timingSafeEqual } from 'crypto';

/**
 * Centralized, typed configuration.
 *
 * All environment-variable parsing lives here so there is a single source of
 * truth (no duplicated `process.env` reads scattered across modules) and so
 * `dotenv` is loaded before anything reads the environment. Secrets are parsed
 * but NEVER logged.
 */

// ---------------- parsing helpers ----------------

function str(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  const v = str(value)?.toLowerCase();
  if (v === undefined) return fallback;
  return v === 'true' || v === '1' || v === 'yes';
}

// ---------------- server ----------------

const nodeEnv = str(process.env.NODE_ENV) ?? 'development';

export const isProduction = nodeEnv === 'production';

export const serverConfig = {
  nodeEnv,
  port: Number(process.env.PORT) || 5001,
} as const;

// ---------------- auth ----------------

const apiKey = str(process.env.API_KEY);
const requireJwt = bool(process.env.AUTH_REQUIRE_JWT, false);

const supabaseUrl = str(process.env.SUPABASE_URL)?.replace(/\/+$/, '');
const jwtSecret = str(process.env.SUPABASE_JWT_SECRET);
const jwtAudience = str(process.env.SUPABASE_JWT_AUD) ?? 'authenticated';
const jwtIssuer = str(process.env.SUPABASE_JWT_ISSUER) ?? (supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined);

export const authConfig = {
  /** True once the frontend migration is complete; disables the legacy path entirely. */
  requireJwt,
  jwt: {
    /** Legacy HS256 shared secret (Supabase "JWT Secret"). */
    secret: jwtSecret,
    /** Base URL used to derive the JWKS endpoint for asymmetric signing keys. */
    supabaseUrl,
    /** Expected `aud` claim; always verified. */
    audience: jwtAudience,
    /** Expected `iss` claim; verified only when configured/derivable. */
    issuer: jwtIssuer,
    /** True when at least one verification key source is configured. */
    configured: Boolean(jwtSecret || supabaseUrl),
  },
} as const;

/**
 * Constant-time comparison of a candidate API key against the configured key.
 * Length is compared first (an unavoidable, acceptable leak); the byte
 * comparison itself is timing-safe.
 */
export function verifyApiKey(candidate: string | undefined): boolean {
  if (!apiKey || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(apiKey);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** True when a legacy API key is configured at all. */
export const apiKeyConfigured = Boolean(apiKey);

// ---------------- startup validation ----------------

/**
 * Validate configuration at startup. Fatal problems throw in production so the
 * process fails fast; in development they are surfaced as warnings so local
 * work is not blocked. Never prints secret values.
 */
export function validateConfig(): void {
  const fatal: string[] = [];
  const warnings: string[] = [];

  // JWT-only mode with no way to verify a JWT bricks all authentication.
  if (authConfig.requireJwt && !authConfig.jwt.configured) {
    fatal.push(
      'AUTH_REQUIRE_JWT=true but no JWT verification is configured. Set SUPABASE_JWT_SECRET or SUPABASE_URL.'
    );
  }

  // The legacy compatibility path needs an API key to function.
  if (!authConfig.requireJwt && !apiKeyConfigured) {
    const msg =
      'API_KEY is not set — the legacy compatibility auth path cannot validate requests.';
    (isProduction ? fatal : warnings).push(msg);
  }

  for (const w of warnings) console.warn(`⚠️  config: ${w}`);

  if (fatal.length > 0) {
    const message =
      'Invalid configuration:\n' + fatal.map((e) => `  - ${e}`).join('\n');
    if (isProduction) throw new Error(message);
    console.warn(`⚠️  ${message}`);
  }
}
