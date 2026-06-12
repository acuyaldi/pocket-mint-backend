import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';

const transactionRouter = Router();

transactionRouter.get('/', TransactionController.getAll);
transactionRouter.post('/', TransactionController.create);
transactionRouter.delete('/:id', TransactionController.delete);

export { transactionRouter };
