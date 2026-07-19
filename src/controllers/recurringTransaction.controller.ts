import { Request, Response, NextFunction } from 'express';
import { Prisma } from '../generated/prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { CreateRecurringTransactionDto, UpdateRecurringTransactionDto } from '../models/recurringTransaction.model';
import { recurringTransactionService } from '../services/recurringTransaction.service';
import type {
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
  RecurringTransactionWithRelations,
} from '../services/recurringTransaction.types';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';

/** Allowlist create fields from the request body into the service input. */
function mapCreateRequest(
  req: Request<unknown, unknown, CreateRecurringTransactionDto>,
  userId: string
): CreateRecurringTransactionInput {
  const b = req.body;
  return {
    userId,
    name: b.name,
    walletId: b.walletId,
    categoryId: b.categoryId,
    type: b.type,
    amountMode: b.amountMode,
    amount: b.amount,
    description: b.description,
    frequency: b.frequency,
    startDate: b.startDate,
    endDate: b.endDate,
  };
}

/** Allowlist update fields from the request body into the service input. */
function mapUpdateRequest(
  req: Request<{ id: string }, unknown, UpdateRecurringTransactionDto>,
  userId: string
): UpdateRecurringTransactionInput {
  const b = req.body;
  return {
    userId,
    id: req.params.id,
    name: b.name,
    walletId: b.walletId,
    categoryId: b.categoryId,
    type: b.type,
    amountMode: b.amountMode,
    amount: b.amount,
    description: b.description,
    frequency: b.frequency,
    startDate: b.startDate,
    endDate: b.endDate,
    isActive: b.isActive,
  };
}

// Decimal (Prisma) → number agar JSON-nya bersih buat frontend; null (FLEXIBLE) passes through.
const serialize = (template: RecurringTransactionWithRelations & { amount: Prisma.Decimal | null }) => ({
  ...template,
  amount: template.amount === null ? null : parseFloat(template.amount.toString()),
});

export class RecurringTransactionController {
  // GET /api/v1/recurring-transactions
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const templates = await recurringTransactionService.listRecurringTransactions(userId);
      sendSuccess(res, templates.map(serialize), 'Retrieved recurring transaction templates');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // POST /api/v1/recurring-transactions
  static async create(
    req: Request<unknown, unknown, CreateRecurringTransactionDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const created = await recurringTransactionService.createRecurringTransaction(mapCreateRequest(req, userId));
      sendSuccess(res, serialize(created), 'Recurring transaction template created successfully', 201);
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // PUT /api/v1/recurring-transactions/:id
  static async update(
    req: Request<{ id: string }, unknown, UpdateRecurringTransactionDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const updated = await recurringTransactionService.updateRecurringTransaction(mapUpdateRequest(req, userId));
      sendSuccess(res, serialize(updated), 'Recurring transaction template updated successfully');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // DELETE /api/v1/recurring-transactions/:id
  static async delete(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const result = await recurringTransactionService.deleteRecurringTransaction({ userId, id: req.params.id });
      sendSuccess(res, result, `Recurring transaction template ${result.id} deleted successfully`);
    } catch (err) {
      forwardError(err, res, next);
    }
  }
}
