// ============================================================
// Rule controller (Phase 20)
// ------------------------------------------------------------
// Thin HTTP mapping: allowlists request fields, calls
// rule.service.ts, and maps the result through the single
// `toRuleDto` serializer. Mirrors merchantMapping.controller.ts's shape.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';
import { ruleService } from '../services/rule.service';
import type { CreateRuleDto, ReorderRulesDto, UpdateRuleDto } from '../models/rule.model';
import type { RuleRecord } from '../services/rule.types';

/** Canonical RuleDto mapper — the ONLY place a rule is serialized for HTTP. */
function toRuleDto(rule: RuleRecord) {
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

export class RuleController {
  // GET /api/v1/rules
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const rules = await ruleService.list({ userId });
      sendSuccess(res, rules.map(toRuleDto), 'Retrieved rules');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // POST /api/v1/rules
  static async create(req: Request<unknown, unknown, CreateRuleDto>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const created = await ruleService.create({
        userId,
        name: req.body.name,
        matchType: req.body.matchType,
        operator: req.body.operator,
        value: req.body.value,
        categoryId: req.body.categoryId,
        enabled: req.body.enabled,
      });
      sendSuccess(res, toRuleDto(created), 'Rule berhasil dibuat', 201);
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // PATCH /api/v1/rules/reorder
  // Registered before /:id in the router so it isn't shadowed by the id param route.
  static async reorder(req: Request<unknown, unknown, ReorderRulesDto>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const rules = await ruleService.reorder({ userId, ruleIds: req.body.ruleIds ?? [] });
      sendSuccess(res, rules.map(toRuleDto), 'Urutan rule berhasil diperbarui');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // PATCH /api/v1/rules/:id
  static async update(req: Request<{ id: string }, unknown, UpdateRuleDto>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const updated = await ruleService.update({
        userId,
        ruleId: req.params.id,
        name: req.body.name,
        matchType: req.body.matchType,
        operator: req.body.operator,
        value: req.body.value,
        categoryId: req.body.categoryId,
        enabled: req.body.enabled,
      });
      sendSuccess(res, toRuleDto(updated), 'Rule berhasil diperbarui');
    } catch (err) {
      forwardError(err, res, next);
    }
  }

  // DELETE /api/v1/rules/:id
  static async remove(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      await ruleService.remove({ userId, ruleId: req.params.id });
      sendSuccess(res, null, 'Rule berhasil dihapus');
    } catch (err) {
      forwardError(err, res, next);
    }
  }
}
