import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const transactionRouter = Router();

// GET /api/v1/transactions — auto-filtered to current month
transactionRouter.get('/', requireUser, TransactionController.getAll);

// GET /api/v1/transactions/all — no month filter
transactionRouter.get('/all', requireUser, TransactionController.getAllTime);

// GET /api/v1/transactions/summary?month=YYYY-MM — monthly P&L
transactionRouter.get('/summary', requireUser, TransactionController.summary);

// GET /api/v1/transactions/export?period=month|quarter|six-months — CSV export.
// Registered before any dynamic /:id route so "export" is never read as an id.
transactionRouter.get('/export', requireUser, TransactionController.export);

// Mutating routes: authenticate first so the mutation limiter keys by user id.
transactionRouter.put('/:id', requireUser, mutationLimiter, TransactionController.update);
transactionRouter.delete('/:id', requireUser, mutationLimiter, TransactionController.delete);
transactionRouter.post('/', requireUser, mutationLimiter, TransactionController.create);

export { transactionRouter };
