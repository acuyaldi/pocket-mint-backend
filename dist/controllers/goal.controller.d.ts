import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/v1/goals
 * List goals for the authenticated user.
 */
export declare function getGoals(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /api/v1/goals
 * Create a goal: name + targetAmount required, deadline/savedAmount optional.
 */
export declare function createGoal(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * PUT /api/v1/goals/:id
 * Update name, targetAmount, savedAmount, or deadline.
 */
export declare function updateGoal(req: Request<{
    id: string;
}>, res: Response, next: NextFunction): Promise<void>;
/**
 * DELETE /api/v1/goals/:id
 */
export declare function deleteGoal(req: Request<{
    id: string;
}>, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=goal.controller.d.ts.map