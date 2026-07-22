// ============================================================
// Correlation ID middleware
// ------------------------------------------------------------
// Attaches a correlation ID to every request. Accepts an
// existing safe header only if repo policy allows it (currently:
// generate a fresh ID for every request). The ID is published
// on `req.correlationId` and returned in the response header.
// ============================================================

import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export const CORRELATION_HEADER = 'X-Correlation-Id';

/**
 * Express declaration merge — makes `correlationId` visible on
 * every Request without a bespoke subtype.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Middleware: generate a fresh correlation ID and attach it to the
 * request and response. We deliberately do NOT accept a
 * caller-supplied correlation ID header — every request gets a
 * new, safe ID. This avoids correlation-injection risks and keeps
 * the log chain intact.
 */
export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = randomUUID();
  req.correlationId = id;
  res.setHeader(CORRELATION_HEADER, id);
  next();
}
