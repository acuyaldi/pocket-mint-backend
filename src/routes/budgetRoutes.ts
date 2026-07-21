import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const budgetRouter = Router();

// GET /api/v1/budgets
budgetRouter.get('/', requireUser, BudgetController.list);
// GET /api/v1/budgets/:id
budgetRouter.get('/:id', requireUser, BudgetController.getOne);

// Mutating routes: authenticate first so the mutation limiter keys by user id.
budgetRouter.post('/', requireUser, mutationLimiter, BudgetController.create);
budgetRouter.patch('/:id', requireUser, mutationLimiter, BudgetController.update);
budgetRouter.post('/:id/archive', requireUser, mutationLimiter, BudgetController.archive);
budgetRouter.post('/:id/restore', requireUser, mutationLimiter, BudgetController.restore);

export { budgetRouter };
