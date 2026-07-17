import { Router } from 'express';
import { getAllWallets, createWallet, updateWallet, deleteWallet, getWalletSparkline } from '../controllers/account.controller';
import { requireUser } from '../middleware/apiKeyAuth';
import { mutationLimiter } from '../middleware/rateLimit';

const walletRouter = Router();

// GET /api/v1/wallets
walletRouter.get('/', requireUser, getAllWallets);

// GET /api/v1/wallets/:id/sparkline
walletRouter.get('/:id/sparkline', requireUser, getWalletSparkline);

// Mutating routes: authenticate first so the mutation limiter keys by user id.
// POST /api/v1/wallets
walletRouter.post('/', requireUser, mutationLimiter, createWallet);

// PUT /api/v1/wallets/:id
walletRouter.put('/:id', requireUser, mutationLimiter, updateWallet);

// DELETE /api/v1/wallets/:id
walletRouter.delete('/:id', requireUser, mutationLimiter, deleteWallet);

export { walletRouter };
