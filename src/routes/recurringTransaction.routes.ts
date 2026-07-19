import { Router } from 'express';
import { RecurringTransactionController } from '../controllers/recurringTransaction.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const recurringTransactionRouter = Router();

// GET /api/v1/recurring-transactions
recurringTransactionRouter.get('/', requireUser, RecurringTransactionController.getAll);

// Mutating routes: authenticate first so the mutation limiter keys by user id.
recurringTransactionRouter.post('/', requireUser, mutationLimiter, RecurringTransactionController.create);
recurringTransactionRouter.put('/:id', requireUser, mutationLimiter, RecurringTransactionController.update);
recurringTransactionRouter.delete('/:id', requireUser, mutationLimiter, RecurringTransactionController.delete);

export { recurringTransactionRouter };
