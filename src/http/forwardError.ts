// ============================================================
// Operational-error forwarding (HTTP boundary)
// ------------------------------------------------------------
// One place that decides how a thrown service error becomes an HTTP response.
// A typed *operational* error (TransactionError, WalletError, and anything else
// following the same shape) keeps its exact status + stable code + safe message
// through the standard error envelope. Anything else is unexpected: it is handed
// untouched to the central error handler (`next(err)`), which redacts internals
// and attaches a correlation id. This never manufactures a 500 here.
//
// Recognition is STRUCTURAL (the `isOperational` flag), so this helper does not
// import each domain's error class and unrelated error hierarchies are not merged.
// ============================================================

import type { Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

/**
 * The contract a service error must satisfy to be forwarded as a client-safe
 * operational error. Both `TransactionError` and `WalletError` already implement
 * it (each sets `isOperational = true` plus `statusCode`/`code`).
 */
export interface OperationalError extends Error {
  statusCode: number;
  code: string;
  isOperational: true;
}

/** Structural guard: a known, client-safe operational error (never an unexpected 5xx). */
export function isOperationalError(err: unknown): err is OperationalError {
  return (
    err instanceof Error &&
    (err as Partial<OperationalError>).isOperational === true &&
    typeof (err as Partial<OperationalError>).statusCode === 'number' &&
    typeof (err as Partial<OperationalError>).code === 'string'
  );
}

/**
 * Forward a caught error. Operational errors are rendered through the existing
 * envelope (`sendError`) with their exact status/code/message; everything else
 * propagates to the central error handler unchanged.
 */
export function forwardError(err: unknown, res: Response, next: NextFunction): void {
  if (isOperationalError(err)) {
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }
  next(err);
}
