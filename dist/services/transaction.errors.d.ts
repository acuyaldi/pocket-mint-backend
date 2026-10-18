export declare class TransactionError extends Error {
    readonly statusCode: number;
    readonly code: string;
    /** Marks this as a known, client-safe error (as opposed to an unexpected 5xx). */
    readonly isOperational = true;
    constructor(message: string, statusCode: number, code: string);
}
/**
 * Phase 37.4 — a deliberate SIBLING of `TransactionError`, not a subclass:
 * `financial-draft.service.ts`'s `confirm()` catch specifically checks
 * `instanceof TransactionError` to decide whether to permanently mark a
 * draft FAILED (a terminal state with no recovery path — see
 * docs/assistant-stuck-states.md). Thrown only for a transient concurrency
 * race (a wallet/category deleted between createTransaction's own ownership
 * check and its write) that the caller can resolve by editing the draft
 * (Phase 34) and retrying confirm — the draft must stay
 * PENDING_CONFIRMATION, not FAILED, so this must never satisfy
 * `instanceof TransactionError`.
 */
export declare class TransactionConcurrencyError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational = true;
    constructor(message: string, statusCode: number, code: string);
}
