"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRouter = void 0;
const express_1 = require("express");
const transaction_controller_1 = require("../controllers/transaction.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const transactionRouter = (0, express_1.Router)();
exports.transactionRouter = transactionRouter;
// GET /api/v1/transactions — auto-filtered to current month
transactionRouter.get('/', apiKeyAuth_1.requireUser, transaction_controller_1.TransactionController.getAll);
// GET /api/v1/transactions/all — no month filter
transactionRouter.get('/all', apiKeyAuth_1.requireUser, transaction_controller_1.TransactionController.getAllTime);
// GET /api/v1/transactions/summary?month=YYYY-MM — monthly P&L
transactionRouter.get('/summary', apiKeyAuth_1.requireUser, transaction_controller_1.TransactionController.summary);
// Mutating routes: authenticate first so the mutation limiter keys by user id.
transactionRouter.put('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, transaction_controller_1.TransactionController.update);
transactionRouter.delete('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, transaction_controller_1.TransactionController.delete);
transactionRouter.post('/', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, transaction_controller_1.TransactionController.create);
//# sourceMappingURL=transaction.routes.js.map