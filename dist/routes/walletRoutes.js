"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRouter = void 0;
const express_1 = require("express");
const account_controller_1 = require("../controllers/account.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const walletRouter = (0, express_1.Router)();
exports.walletRouter = walletRouter;
// GET /api/v1/wallets
walletRouter.get('/', apiKeyAuth_1.requireUser, account_controller_1.getAllWallets);
// GET /api/v1/wallets/:id/sparkline
walletRouter.get('/:id/sparkline', apiKeyAuth_1.requireUser, account_controller_1.getWalletSparkline);
// Mutating routes: authenticate first so the mutation limiter keys by user id.
// POST /api/v1/wallets
walletRouter.post('/', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, account_controller_1.createWallet);
// PUT /api/v1/wallets/:id
walletRouter.put('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, account_controller_1.updateWallet);
// DELETE /api/v1/wallets/:id
walletRouter.delete('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, account_controller_1.deleteWallet);
//# sourceMappingURL=walletRoutes.js.map