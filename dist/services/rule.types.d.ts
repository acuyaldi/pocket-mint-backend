import type { PrismaClient, RuleMatchType, RuleOperator } from '../generated/prisma/client';
export type { RuleMatchType, RuleOperator };
export type RulePrismaClient = Pick<PrismaClient, 'rule' | 'category'>;
export interface RuleRecord {
    id: string;
    userId: string;
    name: string;
    enabled: boolean;
    priority: number;
    matchType: RuleMatchType;
    operator: RuleOperator;
    value: string;
    categoryId: string;
    createdAt: Date;
    updatedAt: Date;
}
/** `userId` is the authenticated caller, never taken from client input. */
export interface CreateRuleInput {
    userId: string;
    name: string;
    matchType: RuleMatchType;
    operator: RuleOperator;
    value: string;
    categoryId: string;
    enabled?: boolean;
}
export interface UpdateRuleInput {
    userId: string;
    ruleId: string;
    name?: string;
    matchType?: RuleMatchType;
    operator?: RuleOperator;
    value?: string;
    categoryId?: string;
    enabled?: boolean;
}
export interface DeleteRuleInput {
    userId: string;
    ruleId: string;
}
export interface ListRulesInput {
    userId: string;
}
/** Full, ordered set of rule ids for this user — the new priority order. */
export interface ReorderRulesInput {
    userId: string;
    ruleIds: string[];
}
//# sourceMappingURL=rule.types.d.ts.map