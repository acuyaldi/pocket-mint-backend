import type { RuleMatchType, RuleOperator } from '../services/rule.types';

// Payload untuk membuat rule (POST /api/v1/rules)
export interface CreateRuleDto {
  name: string;
  matchType: RuleMatchType;
  operator: RuleOperator;
  value: string;
  categoryId: string;
  enabled?: boolean;
}

// Payload untuk memperbarui rule (PATCH /api/v1/rules/:id)
export interface UpdateRuleDto {
  name?: string;
  matchType?: RuleMatchType;
  operator?: RuleOperator;
  value?: string;
  categoryId?: string;
  enabled?: boolean;
}

// Payload untuk reorder rules (PATCH /api/v1/rules/reorder)
export interface ReorderRulesDto {
  ruleIds: string[];
}
