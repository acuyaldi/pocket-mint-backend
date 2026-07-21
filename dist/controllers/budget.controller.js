"use strict";
// ============================================================
// Budget controller (Phase B2 — budgeting-api-contract.md)
// ------------------------------------------------------------
// Thin HTTP mapping: allowlists request fields, calls budget.service.ts for
// mutations and budget-query.service.ts for current-month usage, and maps the
// result through the single `toBudgetDto` serializer. No Prisma/business logic
// here — mirrors savingGoal.controller.ts's shape.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetController = void 0;
const response_1 = require("../utils/response");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const budget_service_1 = require("../services/budget.service");
const budget_query_service_1 = require("../services/budget-query.service");
const budget_errors_1 = require("../services/budget.errors");
const queryParsers_1 = require("../http/queryParsers");
/**
 * Canonical BudgetDto mapper — the ONLY place a Budget is serialized for HTTP.
 * Decimal → number via `parseFloat(v.toString())` (existing convention,
 * savingGoal.controller.ts's `serialize()`). `percentUsed` is left at full,
 * unrounded precision per the API contract; `status` is always the backend's
 * computed value, never re-derived by a caller.
 */
function toBudgetDto(usage) {
    const { budget } = usage;
    return {
        id: budget.id,
        category: { id: budget.category.id, name: budget.category.name, type: budget.category.type },
        amount: parseFloat(budget.amount.toString()),
        spent: parseFloat(usage.spent.toString()),
        remaining: parseFloat(usage.remaining.toString()),
        percentUsed: usage.percentUsed === null ? null : parseFloat(usage.percentUsed.toString()),
        status: usage.status,
        isArchived: budget.isArchived,
        periodStart: usage.periodStart.toISOString(),
        periodEnd: usage.periodEnd.toISOString(),
        createdAt: budget.createdAt.toISOString(),
        updatedAt: budget.updatedAt.toISOString(),
    };
}
/** Compose a mutation response: reload current-month usage for the mutated Budget. */
async function respondWithUsage(res, userId, budgetId, message, statusCode = 200) {
    const usage = await budget_query_service_1.budgetQueryService.getBudgetUsage({ userId, budgetId });
    (0, response_1.sendSuccess)(res, toBudgetDto(usage), message, statusCode);
}
class BudgetController {
    // GET /api/v1/budgets
    static async list(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const status = (0, queryParsers_1.scalarString)(req.query.status) ?? 'active';
            if (status !== 'active' && status !== 'archived') {
                return (0, response_1.sendError)(res, 'status must be "active" or "archived"', 400, 'BAD_REQUEST');
            }
            const usages = await budget_query_service_1.budgetQueryService.listActiveBudgetUsage({ userId, status });
            (0, response_1.sendSuccess)(res, usages.map(toBudgetDto), 'Retrieved budgets');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // GET /api/v1/budgets/:id
    static async getOne(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const usage = await budget_query_service_1.budgetQueryService.getBudgetUsage({ userId, budgetId: req.params.id });
            (0, response_1.sendSuccess)(res, toBudgetDto(usage), 'Retrieved budget');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/budgets
    static async create(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const created = await budget_service_1.budgetService.createBudget({
                userId,
                categoryId: req.body.categoryId,
                amount: req.body.amount,
            });
            await respondWithUsage(res, userId, created.id, 'Anggaran berhasil dibuat', 201);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PATCH /api/v1/budgets/:id
    static async update(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            if (Object.prototype.hasOwnProperty.call(req.body, 'categoryId')) {
                throw new budget_errors_1.BudgetError('Kategori anggaran tidak dapat diubah', 422, 'CATEGORY_NOT_EDITABLE');
            }
            const updated = await budget_service_1.budgetService.updateBudgetAmount({
                userId,
                budgetId: req.params.id,
                amount: req.body.amount,
            });
            await respondWithUsage(res, userId, updated.id, 'Anggaran berhasil diperbarui');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/budgets/:id/archive
    static async archive(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const archived = await budget_service_1.budgetService.archiveBudget({ userId, budgetId: req.params.id });
            await respondWithUsage(res, userId, archived.id, 'Anggaran berhasil diarsipkan');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/budgets/:id/restore
    static async restore(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const restored = await budget_service_1.budgetService.restoreBudget({ userId, budgetId: req.params.id });
            await respondWithUsage(res, userId, restored.id, 'Anggaran berhasil dipulihkan');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.BudgetController = BudgetController;
//# sourceMappingURL=budget.controller.js.map