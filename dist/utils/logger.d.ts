/**
 * Minimal structured logger.
 *
 * Emits single-line JSON so logs are greppable/parseable without pulling in a
 * full logging platform. Callers MUST NOT pass secrets (tokens, API keys, raw
 * auth headers) or unnecessary user identifiers in `meta`.
 */
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