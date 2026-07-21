// ============================================================
// Budget controller (Phase B2 — budgeting-api-contract.md)
// ------------------------------------------------------------
// Thin HTTP mapping: allowlists request fields, calls budget.service.ts for
// mutations and budget-query.service.ts for current-month usage, and maps the
// result through the single `toBudgetDto` serializer. No Prisma/business logic
// here — mirrors savingGoal.controller.ts's shape.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';
import { budgetService } from '../services/budget.service';
import { budgetQueryService } from '../services/budget-query.service';
import { BudgetError } from '../services/budget.errors';
import { scalarString } from '../http/queryParsers';
import type { CreateBudgetDto, UpdateBudgetAmountDto } from '../models/budget.model';
import type { BudgetWithUsage } from '../services/budget-query.types';

/**
 * Canonical BudgetDto mapper — the ONLY place a Budget is serialized for HTTP.
 * Decimal → number via `parseFloat(v.toString())` (existing convention,
 * savingGoal.controller.ts's `serialize()`). `percentUsed` is left at full,
 * unrounded precision per the API contract; `status` is always the backend's
 * computed value, never re-derived by a caller.
 */
function toBudgetDto(usage: BudgetWithUsage) {
  const { budget } = usage;
  return {
    id: budget.id,
    category: { id: budget.category.id, name: budget.category.name, type: budget.category.type },
    amount: parseFloat(budget.amount.toString()),
    spent: parseFloat(usage.spent.toString()),
    remaining: parseFloat(usage.remaining.toString()),
    percentUsed: usage.percentUsed === null ? null : parseFloat(usage.percentUsed.toString()),
    status: usage.status,
    isArchived: budget.isArchived,
    periodStart: usage.periodStart.toISOString(),
    periodEnd: usage.periodEnd.toISOString(),
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}

/** Compose a mutation response: reload current-month usage for the mutated Budget. */
async function respondWithUsage(res: Response, userId: string, budgetId: string, message: string, statusCode = 200) {
  const usage = await budgetQueryService.getBudgetUsage({ userId, budgetId });
  sendSuccess(res, toBudgetDto(usage), message, statusCode);
}

export class BudgetController {
  // GET /api/v1/budgets
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const status = scalarString(req.query.status) ?? 'active';
      if (status !== 'active' && status !== 'archived') {
        return sendError(res, 'status must be "active" or "archived"', 400, 'BAD_REQUEST');
      }

      const usages = await budgetQueryService.listActiveBudgetUsage({ userId, status });
      sendSuccess(res, usages.map(toBudgetDto), 'Retrieved budgets');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // GET /api/v1/budgets/:id
  static async getOne(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const usage = await budgetQueryService.getBudgetUsage({ userId, budgetId: req.params.id });
      sendSuccess(res, toBudgetDto(usage), 'Retrieved budget');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // POST /api/v1/budgets
  static async create(req: Request<unknown, unknown, CreateBudgetDto>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const created = await budgetService.createBudget({
        userId,
        categoryId: req.body.categoryId,
        amount: req.body.amount,
      });
      await respondWithUsage(res, userId, created.id, 'Anggaran berhasil dibuat', 201);
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // PATCH /api/v1/budgets/:id
  static async update(req: Request<{ id: string }, unknown, UpdateBudgetAmountDto & { categoryId?: unknown }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      if (Object.prototype.hasOwnProperty.call(req.body, 'categoryId')) {
        throw new BudgetError('Kategori anggaran tidak dapat diubah', 422, 'CATEGORY_NOT_EDITABLE');
      }

      const updated = await budgetService.updateBudgetAmount({
        userId,
        budgetId: req.params.id,
        amount: req.body.amount,
      });
      await respondWithUsage(res, userId, updated.id, 'Anggaran berhasil diperbarui');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // POST /api/v1/budgets/:id/archive
  static async archive(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const archived = await budgetService.archiveBudget({ userId, budgetId: req.params.id });
      await respondWithUsage(res, userId, archived.id, 'Anggaran berhasil diarsipkan');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // POST /api/v1/budgets/:id/restore
  static async restore(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const restored = await budgetService.restoreBudget({ userId, budgetId: req.params.id });
      await respondWithUsage(res, userId, restored.id, 'Anggaran berhasil dipulihkan');
    } catch (err) {
      forwardError(err, res, next);
    }
  }
}
