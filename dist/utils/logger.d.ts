/**
 * Minimal structured logger.
 *
 * Emits single-line JSON so logs are greppable/parseable without pulling in a
 * full logging platform. All metadata is passed through `redact()` first, so
 * even if a caller accidentally includes a secret it is never written.
 */
/**
 * Return a deep copy of `meta` with sensitive values replaced by `[REDACTED]`.
 * Never mutates the input. Handles nested objects/arrays, differently cased
 * keys, circular references, and bounds depth/breadth to keep log lines sane.
 */
export declare function redact(meta: Record<string, unknown>): Record<string, unknown>;
export declare const logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
};
/**
 * Record a use of the deprecated legacy (API-key + `x-user-id`) auth path.
 * Emits a throttled warning (at most once per interval) so the owner can see
 * that legacy auth is still in use — without flooding logs on every request
 * and without logging any user identity or secret.
 */
export declare function recordLegacyAuthUsage(): void;
//# sourceMappingURL=logger.d.ts.map