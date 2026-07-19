import { Request, Response, NextFunction } from 'express';
import { Prisma } from '../generated/prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { CreateSavingGoalDto, UpdateSavingGoalDto, UpdateSavingGoalProgressDto } from '../models/savingGoal.model';
import { savingGoalService } from '../services/savingGoal.service';
import { reportingConfig } from '../config';
import { formatReportingDate } from '../domain/reportingTime';
import type {
  CreateSavingGoalInput,
  SavingGoalRecord,
  UpdateSavingGoalInput,
  UpdateSavingGoalProgressInput,
} from '../services/savingGoal.types';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';

/** Allowlist create fields from the request body into the service input. */
function mapCreateRequest(
  req: Request<unknown, unknown, CreateSavingGoalDto>,
  userId: string
): CreateSavingGoalInput {
  const b = req.body;
  return {
    userId,
    name: b.name,
    targetAmount: b.targetAmount,
    currentAmount: b.currentAmount,
    targetDate: b.targetDate,
    notes: b.notes,
  };
}

/** Allowlist metadata update fields from the request body into the service input. */
function mapUpdateRequest(
  req: Request<{ id: string }, unknown, UpdateSavingGoalDto>,
  userId: string
): UpdateSavingGoalInput {
  const b = req.body;
  return {
    userId,
    id: req.params.id,
    name: b.name,
    targetAmount: b.targetAmount,
    targetDate: b.targetDate,
    notes: b.notes,
  };
}

/** Allowlist progress update fields from the request body into the service input. */
function mapProgressRequest(
  req: Request<{ id: string }, unknown, UpdateSavingGoalProgressDto>,
  userId: string
): UpdateSavingGoalProgressInput {
  return { userId, id: req.params.id, currentAmount: req.body.currentAmount };
}

// Decimal (Prisma) → number at the response boundary, plus derived fields the
// spec requires but that are never persisted: remainingAmount and
// progressPercentage (capped display-wise at 100, actual amount may exceed it).
const serialize = (goal: SavingGoalRecord) => {
  const targetAmount = goal.targetAmount as Prisma.Decimal;
  const currentAmount = goal.currentAmount as Prisma.Decimal;
  const remainingAmount = Prisma.Decimal.max(targetAmount.minus(currentAmount), 0);
  const progressPercentage =
    targetAmount.greaterThan(0)
      ? Math.min(currentAmount.div(targetAmount).times(100).toNumber(), 100)
      : 0;

  return {
    ...goal,
    targetAmount: parseFloat(targetAmount.toString()),
    currentAmount: parseFloat(currentAmount.toString()),
    remainingAmount: parseFloat(remainingAmount.toString()),
    progressPercentage: Math.round(progressPercentage * 100) / 100,
    targetDate: goal.targetDate ? formatReportingDate(goal.targetDate, reportingConfig.timezone) : null,
  };
};

export class SavingGoalController {
  // GET /api/v1/saving-goals
  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const goals = await savingGoalService.listSavingGoals(userId);
      sendSuccess(res, goals.map(serialize), 'Retrieved saving goals');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // GET /api/v1/saving-goals/:id
  static async getOne(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const goal = await savingGoalService.getSavingGoal({ userId, id: req.params.id });
      sendSuccess(res, serialize(goal), 'Retrieved saving goal');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // POST /api/v1/saving-goals
  static async create(
    req: Request<unknown, unknown, CreateSavingGoalDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const created = await savingGoalService.createSavingGoal(mapCreateRequest(req, userId));
      sendSuccess(res, serialize(created), 'Target tabungan berhasil dibuat', 201);
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // PATCH /api/v1/saving-goals/:id
  static async update(
    req: Request<{ id: string }, unknown, UpdateSavingGoalDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const updated = await savingGoalService.updateSavingGoal(mapUpdateRequest(req, userId));
      sendSuccess(res, serialize(updated), 'Target tabungan berhasil diperbarui');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // PATCH /api/v1/saving-goals/:id/progress
  static async updateProgress(
    req: Request<{ id: string }, unknown, UpdateSavingGoalProgressDto>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const updated = await savingGoalService.updateSavingGoalProgress(mapProgressRequest(req, userId));
      sendSuccess(res, serialize(updated), 'Progres target tabungan berhasil diperbarui');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // POST /api/v1/saving-goals/:id/archive
  static async archive(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) {
        return sendError(res, 'Unauthorized', 401);
      }
      const archived = await savingGoalService.archiveSavingGoal({ userId, id: req.params.id });
      sendSuccess(res, serialize(archived), 'Target tabungan berhasil diarsipkan');
    } catch (err) {
      forwardError(err, res, next);
    }
  }
}
