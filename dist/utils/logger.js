"use strict";
/**
 * Minimal structured logger.
 *
 * Emits single-line JSON so logs are greppable/parseable without pulling in a
 * full logging platform. All metadata is passed through `redact()` first, so
 * even if a caller accidentally includes a secret it is never written.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.redact = redact;
exports.recordLegacyAuthUsage = recordLegacyAuthUsage;
// ---------------- redaction ----------------
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;
const MAX_ARRAY = 100;
const MAX_KEYS = 200;
/**
 * Sensitive key fragments (matched case-insensitively against the key with all
 * non-alphanumerics stripped). Substring matching intentionally over-redacts:
 * e.g. `apikey` also covers `x-api-key`, `token` covers `accessToken` /
 * `refreshToken`, `databaseurl` covers `database_url` / `DATABASE_URL`.
 */
const SENSITIVE_FRAGMENTS = [
    'password',
    'passwd',
    'pwd',
    'secret',
    'token',
    'authorization',
    'cookie',
    'apikey',
    'databaseurl',
    'connectionstring',
    'credential',
];
function isSensitiveKey(key) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return SENSITIVE_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}
function redactValue(value, depth, seen) {
    if (value === null || typeof value !== 'object')
        return value;
    if (seen.has(value))
        return '[Circular]';
    if (depth >= MAX_DEPTH)
        return '[Truncated]';
    seen.add(value);
    try {
        if (Array.isArray(value)) {
            const out = value.slice(0, MAX_ARRAY).map((item) => redactValue(item, depth + 1, seen));
            if (value.length > MAX_ARRAY)
                out.push(`[+${value.length - MAX_ARRAY} more]`);
            return out;
        }
        const source = value;
        const out = {};
        for (const key of Object.keys(source).slice(0, MAX_KEYS)) {
            out[key] = isSensitiveKey(key) ? REDACTED : redactValue(source[key], depth + 1, seen);
        }
        return out;
    }
    finally {
        // Only guard against cycles along the current path, not repeated siblings.
        seen.delete(value);
    }
}
/**
 * Return a deep copy of `meta` with sensitive values replaced by `[REDACTED]`.
 * Never mutates the input. Handles nested objects/arrays, differently cased
 * keys, circular references, and bounds depth/breadth to keep log lines sane.
 */
function redact(meta) {
    return redactValue(meta, 0, new WeakSet());
}
// ---------------- emit ----------------
function emit(level, message, meta) {
    const safeMeta = meta ? redact(meta) : undefined;
    let line;
    try {
        line = JSON.stringify({ level, message, ...safeMeta, ts: new Date().toISOString() });
    }
    catch {
        line = JSON.stringify({ level, message, ts: new Date().toISOString(), meta: '[unserializable]' });
    }
    if (level === 'error')
        console.error(line);
    else if (level === 'warn')
        console.warn(line);
    else
        console.log(line);
}
exports.logger = {
    info: (message, meta) => emit('info', message, meta),
    warn: (message, meta) => emit('warn', message, meta),
    error: (message, meta) => emit('error', message, meta),
};
// ---------------- legacy-auth deprecation signal ----------------
const LEGACY_WARN_INTERVAL_MS = 5 * 60000;
let lastLegacyWarnAt = 0;
let legacyOccurrences = 0;
/**
 * Record a use of the deprecated legacy (API-key + `x-user-id`) auth path.
 * Emits a throttled warning (at most once per interval) so the owner can see
 * that legacy auth is still in use — without flooding logs on every request
 * and without logging any user identity or secret.
 */
function recordLegacyAuthUsage() {
    legacyOccurrences += 1;
    const now = Date.now();
    if (now - lastLegacyWarnAt < LEGACY_WARN_INTERVAL_MS)
        return;
    exports.logger.warn('deprecated legacy auth path used (API key + x-user-id)', {
        authMethod: 'legacy-api-key',
        occurrencesSinceLastWarning: legacyOccurrences,
        action: 'Migrate clients to Authorization: Bearer <supabase-jwt>, then set AUTH_REQUIRE_JWT=true',
    });
    lastLegacyWarnAt = now;
    legacyOccurrences = 0;
}
//# sourceMappingURL=logger.js.map