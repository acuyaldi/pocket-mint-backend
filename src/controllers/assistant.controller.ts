// ============================================================
// Assistant controller
// ------------------------------------------------------------
// Thin HTTP mapping over Assistant Core. Accepts a canonical
// request (not a provider-specific payload), resolves through
// the deterministic pipeline, and returns the canonical
// response envelope. Uses existing auth, error handling, and
// response utilities unchanged.
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserId } from '../http/authContext';
import { sendSuccess, sendError } from '../utils/response';
import { forwardError, isOperationalError } from '../http/forwardError';
import { resolveIntent } from '../assistant/intent';
import { executeTool } from '../assistant/executor';
import { renderMonthlySpendingSummary } from '../assistant/renderer';
import {
  toolRegistry,
  handlerRegistry,
} from '../assistant/bootstrap';
import { AssistantError } from '../assistant/errors';
import type {
  AssistantCanonicalRequest,
  AssistantCanonicalResponse,
} from '../assistant/types';

/** Structural guard for the request body. */
function isCanonicalRequest(body: unknown): body is AssistantCanonicalRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.intent === 'string';
}

/**
 * POST /v1/assistant/execute
 *
 * Authenticated. Accepts a provider-neutral canonical request.
 * Never accepts a caller-supplied user ID — identity comes from
 * the verified JWT via `req.auth`.
 */
export async function assistantExecute(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Auth
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    // Validate request body
    if (!isCanonicalRequest(req.body)) {
      sendError(res, 'Request body must include a string "intent" field', 400, 'BAD_REQUEST');
      return;
    }

    const correlationId = req.correlationId;

    // Helper: send an operational Assistant error with the correlation ID
    // visible in the body (the header was already set by correlationMiddleware).
    function sendAssistantError(
      message: string,
      statusCode: number,
      code: string,
    ): void {
      res.status(statusCode).json({
        success: false,
        error: { code, statusCode, message, correlationId },
      });
    }

    // Resolve intent (allow-listed)
    let resolved;
    try {
      resolved = resolveIntent(req.body);
    } catch (err) {
      if (isOperationalError(err)) {
        sendAssistantError(err.message, err.statusCode, err.code);
      } else {
        next(err);
      }
      return;
    }

    // Build trusted execution context
    const ctx = {
      userId,
      correlationId,
      conversationId: req.body.conversationId,
      timestamp: new Date(),
    };

    // Execute
    let result;
    try {
      result = await executeTool(
        resolved.toolId,
        resolved.arguments,
        ctx,
        toolRegistry,
        handlerRegistry,
      );
    } catch (err) {
      if (isOperationalError(err)) {
        sendAssistantError(err.message, err.statusCode, err.code);
      } else {
        next(err);
      }
      return;
    }

    // Render
    const renderedText = renderMonthlySpendingSummary(result.output as never);

    // Build canonical response
    const response: AssistantCanonicalResponse = {
      status: 'success',
      renderedText,
      data: result.output,
      correlationId,
    };

    sendSuccess(res, response, 'Assistant executed successfully');
  } catch (err) {
    forwardError(err, res, next);
  }
}
