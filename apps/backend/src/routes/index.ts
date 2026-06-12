import { Router } from 'express';
import { exampleRouter } from './example.routes';
import { transactionRouter } from './transaction.routes';

const router = Router();

// Register route modules here
router.use('/examples', exampleRouter);

// API v1
router.use('/v1/transactions', transactionRouter);

export { router };
