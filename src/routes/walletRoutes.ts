import { Router } from 'express';
import { getAllWallets, createWallet, updateWallet, deleteWallet, getWalletSparkline } from '../controllers/account.controller';
import { requireUser } from '../middleware/apiKeyAuth';

const walletRouter = Router();

// GET /api/v1/wallets
walletRouter.get('/', requireUser, getAllWallets);

// GET /api/v1/wallets/:id/sparkline
walletRouter.get('/:id/sparkline', requireUser, getWalletSparkline);

// POST /api/v1/wallets
walletRouter.post('/', requireUser, createWallet);

// PUT /api/v1/wallets/:id
walletRouter.put('/:id', requireUser, updateWallet);

// DELETE /api/v1/wallets/:id
walletRouter.delete('/:id', requireUser, deleteWallet);

export { walletRouter };
