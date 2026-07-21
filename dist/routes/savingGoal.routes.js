"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savingGoalRouter = void 0;
const express_1 = require("express");
const savingGoal_controller_1 = require("../controllers/savingGoal.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const rateLimit_1 = require("../middleware/rateLimit");
const savingGoalRouter = (0, express_1.Router)();
exports.savingGoalRouter = savingGoalRouter;
// GET /api/v1/saving-goals
savingGoalRouter.get('/', apiKeyAuth_1.requireUser, savingGoal_controller_1.SavingGoalController.getAll);
// GET /api/v1/saving-goals/:id
savingGoalRouter.get('/:id', apiKeyAuth_1.requireUser, savingGoal_controller_1.SavingGoalController.getOne);
// Mutating routes: authenticate first so the mutation limiter keys by user id.
savingGoalRouter.post('/', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, savingGoal_controller_1.SavingGoalController.create);
savingGoalRouter.patch('/:id', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, savingGoal_controller_1.SavingGoalController.update);
savingGoalRouter.patch('/:id/progress', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, savingGoal_controller_1.SavingGoalController.updateProgress);
savingGoalRouter.post('/:id/archive', apiKeyAuth_1.requireUser, rateLimit_1.mutationLimiter, savingGoal_controller_1.SavingGoalController.archive);
//# sourceMappingURL=savingGoal.routes.js.map