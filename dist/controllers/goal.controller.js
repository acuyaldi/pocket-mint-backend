"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoals = getGoals;
exports.createGoal = createGoal;
exports.updateGoal = updateGoal;
exports.deleteGoal = deleteGoal;
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("../generated/prisma/client");
const response_1 = require("../utils/response");
// Decimal → number at the response boundary only
const serialize = (g) => ({
    ...g,
    targetAmount: parseFloat(g.targetAmount.toString()),
    savedAmount: parseFloat(g.savedAmount.toString()),
});
/**
 * GET /api/v1/goals
 * List goals for the authenticated user.
 */
async function getGoals(req, res, next) {
    try {
        const userId = req.userId;
        const goals = await prisma_1.default.goal.findMany({
            where: { userId },
            orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        });
        (0, response_1.sendSuccess)(res, goals.map(serialize), 'Retrieved goals');
    }
    catch (err) {
        next(err);
    }
}
/**
 * POST /api/v1/goals
 * Create a goal: name + targetAmount required, deadline/savedAmount optional.
 */
async function createGoal(req, res, next) {
    try {
        const userId = req.userId;
        const { name, targetAmount, savedAmount, deadline } = req.body;
        if (!name || typeof name !== 'string') {
            return (0, response_1.sendError)(res, 'name is required and must be a string', 400);
        }
        if (targetAmount === undefined || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) {
            return (0, response_1.sendError)(res, 'targetAmount is required and must be a positive number', 400);
        }
        let parsedDeadline = null;
        if (deadline) {
            parsedDeadline = new Date(deadline);
            if (isNaN(parsedDeadline.getTime())) {
                return (0, response_1.sendError)(res, 'deadline must be a valid date (e.g. YYYY-MM-DD)', 400);
            }
        }
        const goal = await prisma_1.default.goal.create({
            data: {
                userId,
                name,
                targetAmount: new client_1.Prisma.Decimal(Number(targetAmount)),
                savedAmount: new client_1.Prisma.Decimal(savedAmount !== undefined ? Number(savedAmount) : 0),
                deadline: parsedDeadline,
            },
        });
        (0, response_1.sendSuccess)(res, serialize(goal), 'Goal created successfully', 201);
    }
    catch (err) {
        next(err);
    }
}
/**
 * PUT /api/v1/goals/:id
 * Update name, targetAmount, savedAmount, or deadline.
 */
async function updateGoal(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { name, targetAmount, savedAmount, deadline } = req.body;
        if (targetAmount !== undefined && (isNaN(Number(targetAmount)) || Number(targetAmount) <= 0)) {
            return (0, response_1.sendError)(res, 'targetAmount must be a positive number', 400);
        }
        if (savedAmount !== undefined && (isNaN(Number(savedAmount)) || Number(savedAmount) < 0)) {
            return (0, response_1.sendError)(res, 'savedAmount must be a non-negative number', 400);
        }
        let parsedDeadline;
        if (deadline !== undefined) {
            parsedDeadline = deadline === null ? null : new Date(deadline);
            if (parsedDeadline && isNaN(parsedDeadline.getTime())) {
                return (0, response_1.sendError)(res, 'deadline must be a valid date (e.g. YYYY-MM-DD)', 400);
            }
        }
        // Ownership check: refuse to touch a goal that isn't the caller's.
        const owned = await prisma_1.default.goal.findFirst({ where: { id, userId }, select: { id: true } });
        if (!owned) {
            return (0, response_1.sendError)(res, `Goal with id ${id} not found`, 404);
        }
        const goal = await prisma_1.default.goal.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(targetAmount !== undefined && { targetAmount: new client_1.Prisma.Decimal(Number(targetAmount)) }),
                ...(savedAmount !== undefined && { savedAmount: new client_1.Prisma.Decimal(Number(savedAmount)) }),
                ...(parsedDeadline !== undefined && { deadline: parsedDeadline }),
            },
        });
        (0, response_1.sendSuccess)(res, serialize(goal), 'Goal updated successfully');
    }
    catch (err) {
        if (err.code === 'P2025') {
            return (0, response_1.sendError)(res, `Goal with id ${req.params.id} not found`, 404);
        }
        next(err);
    }
}
/**
 * DELETE /api/v1/goals/:id
 */
async function deleteGoal(req, res, next) {
    try {
        const { id } = req.params;
        const userId = req.userId;
        // Ownership check: refuse to delete a goal that isn't the caller's.
        const owned = await prisma_1.default.goal.findFirst({ where: { id, userId }, select: { id: true } });
        if (!owned) {
            return (0, response_1.sendError)(res, `Goal with id ${id} not found`, 404);
        }
        await prisma_1.default.goal.delete({ where: { id } });
        (0, response_1.sendSuccess)(res, { id }, `Goal ${id} deleted successfully`);
    }
    catch (err) {
        if (err.code === 'P2025') {
            return (0, response_1.sendError)(res, `Goal with id ${req.params.id} not found`, 404);
        }
        next(err);
    }
}
//# sourceMappingURL=goal.controller.js.map