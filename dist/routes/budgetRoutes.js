"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetRouter = void 0;
const express_1 = require("express");
const budget_controller_1 = require("../controllers/budget.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const budgetRouter = (0, express_1.Router)();
exports.budgetRouter = budgetRouter;
// GET /api/v1/budgets
budgetRouter.get('/', apiKeyAuth_1.requireUser, budget_controller_1.BudgetController.list);
// GET /api/v1/budgets/:id
budgetRouter.get('/:id', apiKeyAuth_1.requireUser, budget_controller_1.BudgetController.getOne);
// Mutating routes: authenticate first so the mutation limiter keys by user id.
budgetRouter.post('/', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, budget_controller_1.BudgetController.create);
budgetRouter.patch('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, budget_controller_1.BudgetController.update);
budgetRouter.post('/:id/archive', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, budget_controller_1.BudgetController.archive);
budgetRouter.post('/:id/restore', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, budget_controller_1.BudgetController.restore);
//# sourceMappingURL=budgetRoutes.js.map