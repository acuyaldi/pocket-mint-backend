import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { sendSuccess, sendError } from '../utils/response';

// Decimal → number at the response boundary only
const serialize = (g: { targetAmount: unknown; savedAmount: unknown } & Record<string, unknown>) => ({
  ...g,
  targetAmount: parseFloat((g.targetAmount as any).toString()),
  savedAmount: parseFloat((g.savedAmount as any).toString()),
});

/**
 * GET /api/v1/goals
 * List goals for the authenticated user.
 */
export async function getGoals(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId as string;

    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    });

    sendSuccess(res, goals.map(serialize), 'Retrieved goals');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/goals
 * Create a goal: name + targetAmount required, deadline/savedAmount optional.
 */
export async function createGoal(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId as string;
    const { name, targetAmount, savedAmount, deadline } = req.body;

    if (!name || typeof name !== 'string') {
      return sendError(res, 'name is required and must be a string', 400);
    }
    if (targetAmount === undefined || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) {
      return sendError(res, 'targetAmount is required and must be a positive number', 400);
    }
    let parsedDeadline: Date | null = null;
    if (deadline) {
      parsedDeadline = new Date(deadline);
      if (isNaN(parsedDeadline.getTime())) {
        return sendError(res, 'deadline must be a valid date (e.g. YYYY-MM-DD)', 400);
      }
    }

    const goal = await prisma.goal.create({
      data: {
        userId,
        name,
        targetAmount: new Prisma.Decimal(Number(targetAmount)),
        savedAmount: new Prisma.Decimal(savedAmount !== undefined ? Number(savedAmount) : 0),
        deadline: parsedDeadline,
      },
    });

    sendSuccess(res, serialize(goal), 'Goal created successfully', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/goals/:id
 * Update name, targetAmount, savedAmount, or deadline.
 */
export async function updateGoal(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = (req as any).userId as string;
    const { name, targetAmount, savedAmount, deadline } = req.body;

    if (targetAmount !== undefined && (isNaN(Number(targetAmount)) || Number(targetAmount) <= 0)) {
      return sendError(res, 'targetAmount must be a positive number', 400);
    }
    if (savedAmount !== undefined && (isNaN(Number(savedAmount)) || Number(savedAmount) < 0)) {
      return sendError(res, 'savedAmount must be a non-negative number', 400);
    }
    let parsedDeadline: Date | null | undefined;
    if (deadline !== undefined) {
      parsedDeadline = deadline === null ? null : new Date(deadline);
      if (parsedDeadline && isNaN(parsedDeadline.getTime())) {
        return sendError(res, 'deadline must be a valid date (e.g. YYYY-MM-DD)', 400);
      }
    }

    // Ownership check: refuse to touch a goal that isn't the caller's.
    const owned = await prisma.goal.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) {
      return sendError(res, `Goal with id ${id} not found`, 404);
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(targetAmount !== undefined && { targetAmount: new Prisma.Decimal(Number(targetAmount)) }),
        ...(savedAmount !== undefined && { savedAmount: new Prisma.Decimal(Number(savedAmount)) }),
        ...(parsedDeadline !== undefined && { deadline: parsedDeadline }),
      },
    });

    sendSuccess(res, serialize(goal), 'Goal updated successfully');
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return sendError(res, `Goal with id ${req.params.id} not found`, 404);
    }
    next(err);
  }
}

/**
 * DELETE /api/v1/goals/:id
 */
export async function deleteGoal(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = (req as any).userId as string;

    // Ownership check: refuse to delete a goal that isn't the caller's.
    const owned = await prisma.goal.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) {
      return sendError(res, `Goal with id ${id} not found`, 404);
    }

    await prisma.goal.delete({ where: { id } });
    sendSuccess(res, { id }, `Goal ${id} deleted successfully`);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return sendError(res, `Goal with id ${req.params.id} not found`, 404);
    }
    next(err);
  }
}
