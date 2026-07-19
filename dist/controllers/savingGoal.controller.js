"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavingGoalController = void 0;
const client_1 = require("../generated/prisma/client");
const response_1 = require("../utils/response");
const savingGoal_service_1 = require("../services/savingGoal.service");
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
/** Allowlist create fields from the request body into the service input. */
function mapCreateRequest(req, userId) {
    const b = req.body;
    return {
        userId,
        name: b.name,
        targetAmount: b.targetAmount,
        currentAmount: b.currentAmount,
        targetDate: b.targetDate,
        notes: b.notes,
    };
}
/** Allowlist metadata update fields from the request body into the service input. */
function mapUpdateRequest(req, userId) {
    const b = req.body;
    return {
        userId,
        id: req.params.id,
        name: b.name,
        targetAmount: b.targetAmount,
        targetDate: b.targetDate,
        notes: b.notes,
    };
}
/** Allowlist progress update fields from the request body into the service input. */
function mapProgressRequest(req, userId) {
    return { userId, id: req.params.id, currentAmount: req.body.currentAmount };
}
// Decimal (Prisma) → number at the response boundary, plus derived fields the
// spec requires but that are never persisted: remainingAmount and
// progressPercentage (capped display-wise at 100, actual amount may exceed it).
const serialize = (goal) => {
    const targetAmount = goal.targetAmount;
    const currentAmount = goal.currentAmount;
    const remainingAmount = client_1.Prisma.Decimal.max(targetAmount.minus(currentAmount), 0);
    const progressPercentage = targetAmount.greaterThan(0)
        ? Math.min(currentAmount.div(targetAmount).times(100).toNumber(), 100)
        : 0;
    return {
        ...goal,
        targetAmount: parseFloat(targetAmount.toString()),
        currentAmount: parseFloat(currentAmount.toString()),
        remainingAmount: parseFloat(remainingAmount.toString()),
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        targetDate: goal.targetDate ? (0, reportingTime_1.formatReportingDate)(goal.targetDate, config_1.reportingConfig.timezone) : null,
    };
};
class SavingGoalController {
    // GET /api/v1/saving-goals
    static async getAll(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const goals = await savingGoal_service_1.savingGoalService.listSavingGoals(userId);
            (0, response_1.sendSuccess)(res, goals.map(serialize), 'Retrieved saving goals');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/saving-goals/:id
    static async getOne(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const goal = await savingGoal_service_1.savingGoalService.getSavingGoal({ userId, id: req.params.id });
            (0, response_1.sendSuccess)(res, serialize(goal), 'Retrieved saving goal');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/saving-goals
    static async create(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const created = await savingGoal_service_1.savingGoalService.createSavingGoal(mapCreateRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(created), 'Target tabungan berhasil dibuat', 201);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PATCH /api/v1/saving-goals/:id
    static async update(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const updated = await savingGoal_service_1.savingGoalService.updateSavingGoal(mapUpdateRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(updated), 'Target tabungan berhasil diperbarui');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PATCH /api/v1/saving-goals/:id/progress
    static async updateProgress(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const updated = await savingGoal_service_1.savingGoalService.updateSavingGoalProgress(mapProgressRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(updated), 'Progres target tabungan berhasil diperbarui');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/saving-goals/:id/archive
    static async archive(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const archived = await savingGoal_service_1.savingGoalService.archiveSavingGoal({ userId, id: req.params.id });
            (0, response_1.sendSuccess)(res, serialize(archived), 'Target tabungan berhasil diarsipkan');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.SavingGoalController = SavingGoalController;
//# sourceMappingURL=savingGoal.controller.js.map