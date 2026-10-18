import { Response } from 'express';
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number) => void;
/**
 * Send an operational error in the standard envelope. `code` defaults to a
 * stable mapping of the status; pass an explicit one for domain-specific codes.
 * Messages passed here must be safe to expose (no internals/secrets).
 *
 * `detail` (Phase 37.3) is an optional, bounded, non-sensitive machine marker
 * — e.g. the specific terminal status a draft/clarification conflict was
 * rejected from (`FAILED`, `EXPIRED`, `CANCELLED`, ...) — so a caller can
 * branch on it instead of parsing `message`. Omitted from the envelope
 * entirely when not supplied, so every existing error response is unchanged.
 */
export declare const sendError: (res: Response, message?: string, statusCode?: number, code?: string, detail?: string) => void;
