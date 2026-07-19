"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recurringTransactionRouter = void 0;
const express_1 = require("express");
const recurringTransaction_controller_1 = require("../controllers/recurringTransaction.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const recurringTransactionRouter = (0, express_1.Router)();
exports.recurringTransactionRouter = recurringTransactionRouter;
// GET /api/v1/recurring-transactions
recurringTransactionRouter.get('/', apiKeyAuth_1.requireUser, recurringTransaction_controller_1.RecurringTransactionController.getAll);
// Mutating routes: authenticate first so the mutation limiter keys by user id.
recurringTransactionRouter.post('/', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, recurringTransaction_controller_1.RecurringTransactionController.create);
recurringTransactionRouter.put('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, recurringTransaction_controller_1.RecurringTransactionController.update);
recurringTransactionRouter.delete('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, recurringTransaction_controller_1.RecurringTransactionController.delete);
//# sourceMappingURL=recurringTransaction.routes.js.map