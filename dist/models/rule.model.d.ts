import type { RuleMatchType, RuleOperator } from '../services/rule.types';
export interface CreateRuleDto {
    name: string;
    matchType: RuleMatchType;
    operator: RuleOperator;
    value: string;
    categoryId: string;
    enabled?: boolean;
}
export interface UpdateRuleDto {
    name?: string;
    matchType?: RuleMatchType;
    operator?: RuleOperator;
    value?: string;
    categoryId?: string;
    enabled?: boolean;
}
export interface ReorderRulesDto {
    ruleIds: string[];
}
//# sourceMappingURL=rule.model.d.ts.map