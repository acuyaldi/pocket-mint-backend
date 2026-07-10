"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalRouter = void 0;
const express_1 = require("express");
const goal_controller_1 = require("../controllers/goal.controller");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const goalRouter = (0, express_1.Router)();
exports.goalRouter = goalRouter;
// GET /api/v1/goals
goalRouter.get('/', apiKeyAuth_1.requireUser, goal_controller_1.getGoals);
// POST /api/v1/goals
goalRouter.post('/', apiKeyAuth_1.requireUser, goal_controller_1.createGoal);
// PUT /api/v1/goals/:id
goalRouter.put('/:id', apiKeyAuth_1.requireUser, goal_controller_1.updateGoal);
// DELETE /api/v1/goals/:id
goalRouter.delete('/:id', apiKeyAuth_1.requireUser, goal_controller_1.deleteGoal);
//# sourceMappingURL=goalRoutes.js.map