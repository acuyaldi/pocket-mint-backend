// ============================================================
// Categorization controller
// ------------------------------------------------------------
// Thin HTTP handler: validates auth, parses query params,
// delegates to the categorization service, returns typed
// response. Follows the existing controller conventions.
// ============================================================

import type { NextFunction, Request, Response } from 'express';
import { categorizationService } from '../services/categorization.service';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';
import { sendError, sendSuccess } from '../utils/response';

const VALID_TYPES = ['INCOME', 'EXPENSE'] as const;

/**
 * GET /api/v1/categories/suggestions?description=...&type=EXPENSE
 *
 * Returns up to 5 ranked category suggestions for the given
 * transaction description. Suggestions are ordered by confidence
 * (HIGH → MEDIUM → LOW).
 *
 * Query params:
 *   description — the transaction description/merchant text
 *   type        — "INCOME" or "EXPENSE" (default: "EXPENSE")
 */
export async function getSuggestions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const description = typeof req.query.description === 'string'
      ? req.query.description
      : '';

    const typeParam = typeof req.query.type === 'string'
      ? req.query.type.toUpperCase()
      : 'EXPENSE';

    if (!VALID_TYPES.includes(typeParam as typeof VALID_TYPES[number])) {
      return sendError(res, 'type must be INCOME or EXPENSE', 400);
    }

    const suggestions = await categorizationService.getSuggestions(
      userId,
      description,
      typeParam as 'INCOME' | 'EXPENSE',
    );

    return sendSuccess(res, suggestions, 'Category suggestions');
  } catch (error) {
    return forwardError(error, res, next);
  }
}
