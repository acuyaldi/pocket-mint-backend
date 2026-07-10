import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { requireUser } from '../middleware/apiKeyAuth';

const transactionRouter = Router();

// GET /api/v1/transactions — auto-filtered to current month
transactionRouter.get('/', requireUser, TransactionController.getAll);

// GET /api/v1/transactions/all — no month filter
transactionRouter.get('/all', requireUser, TransactionController.getAllTime);

// GET /api/v1/transactions/summary?month=YYYY-MM — monthly P&L
transactionRouter.get('/summary', requireUser, TransactionController.summary);

transactionRouter.put('/:id', requireUser, TransactionController.update);
transactionRouter.delete('/:id', requireUser, TransactionController.delete);

// POST with user auth middleware
transactionRouter.post('/', requireUser, TransactionController.create);

export { transactionRouter };
