/**
 * Minimal structured logger.
 *
 * Emits single-line JSON so logs are greppable/parseable without pulling in a
 * full logging platform. All metadata is passed through `redact()` first, so
 * even if a caller accidentally includes a secret it is never written.
 */
type Level = 'info' | 'warn' | 'error';
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
/** Bounded error classification — see `src/utils/errorCategory.ts`. */
export type ErrorCategory = 'authentication' | 'authorization' | 'validation' | 'not_found' | 'conflict' | 'expired' | 'already_consumed' | 'idempotency' | 'provider_timeout' | 'provider_rate_limit' | 'provider_unavailable' | 'provider_invalid_response' | 'policy_rejected' | 'tool_failure' | 'database' | 'network' | 'internal';
export type IdempotencyOutcome = 'new' | 'replay' | 'conflict' | 'expired';
/**
 * Canonical, allowlisted field set for Assistant lifecycle events. Deliberately
 * a closed interface (no index signature) so a caller cannot pass through
 * message text, draft payloads, tokens, or other sensitive content by
 * accident — only these operational fields compile.
 */
export interface AssistantLogEvent {
    readonly event: string;
    readonly requestId?: string;
    readonly operation?: string;
    readonly stage?: string;
    readonly outcome?: string;
    readonly durationMs?: number;
    readonly httpStatus?: number;
    readonly errorCategory?: ErrorCategory;
    readonly retryable?: boolean;
    readonly idempotentReplay?: boolean;
    readonly idempotencyOutcome?: IdempotencyOutcome;
    readonly provider?: string;
    readonly model?: string;
    readonly tool?: string;
    readonly environment?: string;
    readonly service?: string;
    readonly clarificationRequired?: boolean;
    readonly draftCreated?: boolean;
    readonly optionCount?: number;
    readonly chainedClarification?: boolean;
    readonly hasActiveClarification?: boolean;
    readonly hasPendingDraft?: boolean;
    readonly hasTerminalClarification?: boolean;
    readonly hasActiveTurn?: boolean;
    readonly attempt?: number;
    readonly leaseRecovered?: boolean;
    /** Callback interaction taxonomy (Phase 26A) — bounded closed-enum labels only, never token/payload content. */
    readonly interactionType?: string;
    readonly terminalStatus?: string;
    /** Capture-quality signals (Phase 35) — bounded labels/booleans only, never message text, amounts, or ids. */
    readonly captureSource?: 'direct' | 'clarification_resolved';
    /** Clarification entity kind ('wallet'/'merchant'/'category'/'transaction_fields'/'provider_text') — never the option labels/tokens. */
    readonly clarificationKind?: string;
    readonly overridesUsed?: boolean;
    /**
     * Opaque internal row ids (Phase 37.4) — cuid strings, never free-text
     * content. Safe for the same reason conversationId/turnId already appear
     * in other Assistant projections (e.g. ops visibility, Phase 28/37.3):
     * they identify a row for correlation, they don't carry a message, an
     * amount, or any user-entered text.
     */
    readonly conversationId?: string;
    readonly turnId?: string;
    readonly draftId?: string;
    readonly executionId?: string;
}
/**
 * Emit a canonical Assistant lifecycle event. Fields are passed through
 * `redact()` like any other log call (defense in depth), but the real
 * safety mechanism is the `AssistantLogEvent` type itself — it only accepts
 * bounded operational metadata, never free-form request/response content.
 */
export declare function logEvent(level: Level, fields: AssistantLogEvent): void;
/** Monotonic-enough millisecond timer for lifecycle-stage durations. */
export declare function startTimer(): () => number;
export {};
