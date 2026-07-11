import { Router } from 'express';
import { transactionRouter } from './transaction.routes';
import { userRouter } from './user.routes';
import { walletRouter } from './walletRoutes';
import { dashboardRouter } from './dashboardRoutes';
import { installmentRouter } from './installmentRoutes';

const router = Router();

// API v1
router.use('/v1/dashboard', dashboardRouter);
router.use('/v1/transactions', transactionRouter);
router.use('/v1/wallets', walletRouter);
router.use('/v1/users', userRouter);
router.use('/v1/installments', installmentRouter);

export { router };
