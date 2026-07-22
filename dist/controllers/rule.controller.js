"use strict";
// ============================================================
// Rule controller (Phase 20)
// ------------------------------------------------------------
// Thin HTTP mapping: allowlists request fields, calls
// rule.service.ts, and maps the result through the single
// `toRuleDto` serializer. Mirrors merchantMapping.controller.ts's shape.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleController = void 0;
const response_1 = require("../utils/response");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const rule_service_1 = require("../services/rule.service");
/** Canonical RuleDto mapper — the ONLY place a rule is serialized for HTTP. */
function toRuleDto(rule) {
    return {
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        priority: rule.priority,
        matchType: rule.matchType,
        operator: rule.operator,
        value: rule.value,
        categoryId: rule.categoryId,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
    };
}
class RuleController {
    // GET /api/v1/rules
    static async list(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const rules = await rule_service_1.ruleService.list({ userId });
            (0, response_1.sendSuccess)(res, rules.map(toRuleDto), 'Retrieved rules');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // POST /api/v1/rules
    static async create(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const created = await rule_service_1.ruleService.create({
                userId,
                name: req.body.name,
                matchType: req.body.matchType,
                operator: req.body.operator,
                value: req.body.value,
                categoryId: req.body.categoryId,
                enabled: req.body.enabled,
            });
            (0, response_1.sendSuccess)(res, toRuleDto(created), 'Rule berhasil dibuat', 201);
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PATCH /api/v1/rules/reorder
    // Registered before /:id in the router so it isn't shadowed by the id param route.
    static async reorder(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const rules = await rule_service_1.ruleService.reorder({ userId, ruleIds: req.body.ruleIds ?? [] });
            (0, response_1.sendSuccess)(res, rules.map(toRuleDto), 'Urutan rule berhasil diperbarui');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // PATCH /api/v1/rules/:id
    static async update(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const updated = await rule_service_1.ruleService.update({
                userId,
                ruleId: req.params.id,
                name: req.body.name,
                matchType: req.body.matchType,
                operator: req.body.operator,
                value: req.body.value,
                categoryId: req.body.categoryId,
                enabled: req.body.enabled,
            });
            (0, response_1.sendSuccess)(res, toRuleDto(updated), 'Rule berhasil diperbarui');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
    // DELETE /api/v1/rules/:id
    static async remove(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            await rule_service_1.ruleService.remove({ userId, ruleId: req.params.id });
            (0, response_1.sendSuccess)(res, null, 'Rule berhasil dihapus');
        }
        catch (err) {
            (0, forwardError_1.forwardError)(err, res, next);
        }
    }
}
exports.RuleController = RuleController;
//# sourceMappingURL=rule.controller.js.map