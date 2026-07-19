import { Router } from 'express';
import { SavingGoalController } from '../controllers/savingGoal.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const savingGoalRouter = Router();

// GET /api/v1/saving-goals
savingGoalRouter.get('/', requireUser, SavingGoalController.getAll);
// GET /api/v1/saving-goals/:id
savingGoalRouter.get('/:id', requireUser, SavingGoalController.getOne);

// Mutating routes: authenticate first so the mutation limiter keys by user id.
savingGoalRouter.post('/', requireUser, mutationLimiter, SavingGoalController.create);
savingGoalRouter.patch('/:id', requireUser, mutationLimiter, SavingGoalController.update);
savingGoalRouter.patch('/:id/progress', requireUser, mutationLimiter, SavingGoalController.updateProgress);
savingGoalRouter.post('/:id/archive', requireUser, mutationLimiter, SavingGoalController.archive);

export { savingGoalRouter };
