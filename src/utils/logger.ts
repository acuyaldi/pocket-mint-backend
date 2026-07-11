/**
 * Minimal structured logger.
 *
 * Emits single-line JSON so logs are greppable/parseable without pulling in a
 * full logging platform. Callers MUST NOT pass secrets (tokens, API keys, raw
 * auth headers) or unnecessary user identifiers in `meta`.
 */

type Level = 'info' | 'warn' | 'error';

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  const line = JSON.stringify({ level, message, ...meta, ts: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};

// ---------------- legacy-auth deprecation signal ----------------

const LEGACY_WARN_INTERVAL_MS = 5 * 60_000;
let lastLegacyWarnAt = 0;
let legacyOccurrences = 0;

/**
 * Record a use of the deprecated legacy (API-key + `x-user-id`) auth path.
 * Emits a throttled warning (at most once per interval) so the owner can see
 * that legacy auth is still in use — without flooding logs on every request
 * and without logging any user identity or secret.
 */
export function recordLegacyAuthUsage(): void {
  legacyOccurrences += 1;
  const now = Date.now();
  if (now - lastLegacyWarnAt < LEGACY_WARN_INTERVAL_MS) return;

  logger.warn('deprecated legacy auth path used (API key + x-user-id)', {
    authMethod: 'legacy-api-key',
    occurrencesSinceLastWarning: legacyOccurrences,
    action: 'Migrate clients to Authorization: Bearer <supabase-jwt>, then set AUTH_REQUIRE_JWT=true',
  });
  lastLegacyWarnAt = now;
  legacyOccurrences = 0;
}
