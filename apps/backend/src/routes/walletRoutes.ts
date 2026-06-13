import { Router } from 'express';
import { getAllWallets, createWallet, updateWallet, deleteWallet, getWalletSparkline } from '../controllers/account.controller';
import { apiKeyAuth } from '../middleware/apiKeyAuth';

const walletRouter = Router();

// GET /api/v1/wallets
walletRouter.get('/', apiKeyAuth, getAllWallets);

// GET /api/v1/wallets/:id/sparkline
walletRouter.get('/:id/sparkline', apiKeyAuth, getWalletSparkline);

// POST /api/v1/wallets
walletRouter.post('/', apiKeyAuth, createWallet);

// PUT /api/v1/wallets/:id
walletRouter.put('/:id', apiKeyAuth, updateWallet);

// DELETE /api/v1/wallets/:id
walletRouter.delete('/:id', apiKeyAuth, deleteWallet);

export { walletRouter };
