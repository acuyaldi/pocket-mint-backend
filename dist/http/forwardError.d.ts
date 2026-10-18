import type { Response, NextFunction } from 'express';
/**
 * The contract a service error must satisfy to be forwarded as a client-safe
 * operational error. Both `TransactionError` and `WalletError` already implement
 * it (each sets `isOperational = true` plus `statusCode`/`code`).
 *
 * `detail` (Phase 37.3) is optional and only `AssistantError` currently sets
 * it (e.g. the specific terminal draft/clarification status a conflict was
 * rejected from) — every other domain error leaves it `undefined`, so
 * `sendError` omits the envelope field for them exactly as before.
 */
export interface OperationalError extends Error {
    statusCode: number;
    code: string;
    isOperational: true;
    detail?: string;
}
/** Structural guard: a known, client-safe operational error (never an unexpected 5xx). */
export declare function isOperationalError(err: unknown): err is OperationalError;
/**
 * Forward a caught error. Operational errors are rendered through the existing
 * envelope (`sendError`) with their exact status/code/message; everything else
 * propagates to the central error handler unchanged.
 */
export declare function forwardError(err: unknown, res: Response, next: NextFunction): void;
