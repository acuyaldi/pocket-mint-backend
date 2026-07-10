import { Router } from 'express';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goal.controller';
import { requireUser } from '../middleware/apiKeyAuth';

const goalRouter = Router();

// GET /api/v1/goals
goalRouter.get('/', requireUser, getGoals);

// POST /api/v1/goals
goalRouter.post('/', requireUser, createGoal);

// PUT /api/v1/goals/:id
goalRouter.put('/:id', requireUser, updateGoal);

// DELETE /api/v1/goals/:id
goalRouter.delete('/:id', requireUser, deleteGoal);

export { goalRouter };
