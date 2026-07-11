import 'dotenv/config';
import { timingSafeEqual } from 'crypto';
import { assertValidTimeZone } from '../domain/reportingTime';

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

function int(value: string | undefined, fallback: number): number {
  const n = Number(str(value));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Express `trust proxy` setting. Defaults to `false` (do not trust any proxy).
 * Set TRUST_PROXY to the NUMBER of trusted reverse-proxy hops in front of the
 * app (e.g. `1` behind a single load balancer). Avoid `true`, which trusts an
 * arbitrary X-Forwarded-For chain and lets clients spoof their rate-limit key.
 */
function parseTrustProxy(value: string | undefined): boolean | number {
  const v = str(value)?.toLowerCase();
  if (v === undefined || v === 'false') return false;
  if (v === 'true') return true;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : false;
}

// ---------------- server ----------------

const nodeEnv = str(process.env.NODE_ENV) ?? 'development';

export const isProduction = nodeEnv === 'production';

export const serverConfig = {
  nodeEnv,
  port: Number(process.env.PORT) || 5001,
} as const;

// One application-wide reporting calendar until user-specific timezones exist.
export const reportingConfig = {
  timezone: assertValidTimeZone(str(process.env.REPORTING_TIMEZONE) ?? 'Asia/Jakarta'),
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

// ---------------- network / rate limiting ----------------

export const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);

/**
 * Rate-limiting configuration. NOTE: the default limiter store is in-memory and
 * therefore PER INSTANCE — limits are not shared across horizontally scaled
 * processes. Move to a shared store (e.g. Redis) when running more than one
 * instance.
 */
export const rateLimitConfig = {
  enabled: bool(process.env.RATE_LIMIT_ENABLED, true),
  windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60_000),
  /** Max requests per window for general API traffic. */
  max: int(process.env.RATE_LIMIT_MAX, 300),
  /** Stricter cap per window for mutating requests (POST/PUT/PATCH/DELETE). */
  mutationMax: int(process.env.RATE_LIMIT_MUTATION_MAX, 60),
} as const;

// ---------------- CORS ----------------

/** Split a comma-separated origin list; trim whitespace and trailing slashes. */
function parseOrigins(value: string | undefined): string[] {
  return (str(value) ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => o.length > 0);
}

const configuredOrigins = parseOrigins(process.env.CORS_ALLOWED_ORIGINS);

/** Dev-only convenience origins. NEVER used when NODE_ENV=production. */
const devDefaultOrigins = ['http://localhost:3000', 'http://localhost:5173'];

export const corsConfig = {
  /** Exact origins allowed for browser requests. */
  allowedOrigins:
    configuredOrigins.length > 0
      ? configuredOrigins
      : isProduction
        ? []
        : devDefaultOrigins,
  /** True when falling back to dev defaults (no explicit allowlist configured). */
  usingDevDefault: configuredOrigins.length === 0 && !isProduction,
} as const;

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

  // Production must define an explicit CORS allowlist (never wildcard).
  if (isProduction && corsConfig.allowedOrigins.length === 0) {
    fatal.push('CORS_ALLOWED_ORIGINS must list at least one origin in production.');
  }
  if (corsConfig.usingDevDefault) {
    warnings.push(
      `CORS_ALLOWED_ORIGINS not set — using development defaults (${corsConfig.allowedOrigins.join(', ')}).`
    );
  }

  for (const w of warnings) console.warn(`⚠️  config: ${w}`);

  if (fatal.length > 0) {
    const message =
      'Invalid configuration:\n' + fatal.map((e) => `  - ${e}`).join('\n');
    if (isProduction) throw new Error(message);
    console.warn(`⚠️  ${message}`);
  }
}
