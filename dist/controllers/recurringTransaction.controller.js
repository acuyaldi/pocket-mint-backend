"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurringTransactionController = void 0;
const response_1 = require("../utils/response");
const recurringTransaction_service_1 = require("../services/recurringTransaction.service");
const config_1 = require("../config");
const reportingTime_1 = require("../domain/reportingTime");
const billingCycle_1 = require("../domain/billingCycle");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
/** Allowlist create fields from the request body into the service input. */
function mapCreateRequest(req, userId) {
    const b = req.body;
    return {
        userId,
        name: b.name,
        walletId: b.walletId,
        categoryId: b.categoryId,
        type: b.type,
        amountMode: b.amountMode,
        amount: b.amount,
        description: b.description,
        frequency: b.frequency,
        startDate: b.startDate,
        endDate: b.endDate,
        reminderEnabled: b.reminderEnabled,
        reminderOffsetDays: b.reminderOffsetDays,
    };
}
/** Allowlist update fields from the request body into the service input. */
function mapUpdateRequest(req, userId) {
    const b = req.body;
    return {
        userId,
        id: req.params.id,
        name: b.name,
        walletId: b.walletId,
        categoryId: b.categoryId,
        type: b.type,
        amountMode: b.amountMode,
        amount: b.amount,
        description: b.description,
        frequency: b.frequency,
        startDate: b.startDate,
        endDate: b.endDate,
        isActive: b.isActive,
        reminderEnabled: b.reminderEnabled,
        reminderOffsetDays: b.reminderOffsetDays,
    };
}
// Decimal (Prisma) → number agar JSON-nya bersih buat frontend; null (FLEXIBLE) passes through.
// nextDueDate: derived, display-only projection from the template (Phase 2) — monthly-only, null when
// paused or once endDate has passed. No transaction generation happens here.
const serialize = (template) => {
    const nextDueDate = template.isActive && template.frequency === 'MONTHLY'
        ? (0, billingCycle_1.nextMonthlyOccurrence)((0, reportingTime_1.formatReportingDate)(template.startDate, config_1.reportingConfig.timezone), template.endDate ? (0, reportingTime_1.formatReportingDate)(template.endDate, config_1.reportingConfig.timezone) : null, (0, reportingTime_1.formatReportingDate)(new Date(), config_1.reportingConfig.timezone))
        : null;
    return {
        ...template,
        amount: template.amount === null ? null : parseFloat(template.amount.toString()),
        nextDueDate,
    };
};
class RecurringTransactionController {
    // GET /api/v1/recurring-transactions
    static async getAll(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const templates = await recurringTransaction_service_1.recurringTransactionService.listRecurringTransactions(userId);
            (0, response_1.sendSuccess)(res, templates.map(serialize), 'Retrieved recurring transaction templates');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/recurring-transactions
    static async create(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const created = await recurringTransaction_service_1.recurringTransactionService.createRecurringTransaction(mapCreateRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(created), 'Recurring transaction template created successfully', 201);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PUT /api/v1/recurring-transactions/:id
    static async update(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const updated = await recurringTransaction_service_1.recurringTransactionService.updateRecurringTransaction(mapUpdateRequest(req, userId));
            (0, response_1.sendSuccess)(res, serialize(updated), 'Recurring transaction template updated successfully');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // DELETE /api/v1/recurring-transactions/:id
    static async delete(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId) {
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            }
            const result = await recurringTransaction_service_1.recurringTransactionService.deleteRecurringTransaction({ userId, id: req.params.id });
            (0, response_1.sendSuccess)(res, result, `Recurring transaction template ${result.id} deleted successfully`);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.RecurringTransactionController = RecurringTransactionController;
//# sourceMappingURL=recurringTransaction.controller.js.map