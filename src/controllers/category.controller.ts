import type { NextFunction, Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';
import { sendError, sendSuccess } from '../utils/response';

export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return sendError(res, 'Unauthorized', 401);

    const categories = await categoryService.listCategories(userId);
    return sendSuccess(res, categories, 'Retrieved categories');
  } catch (error) {
    return forwardError(error, res, next);
  }
}
