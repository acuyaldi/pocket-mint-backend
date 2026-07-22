import type { CreateRuleInput, DeleteRuleInput, ListRulesInput, ReorderRulesInput, RulePrismaClient, RuleRecord, UpdateRuleInput } from './rule.types';
export declare function createRuleService(db: RulePrismaClient): {
    list: (input: ListRulesInput) => Promise<RuleRecord[]>;
    create: (input: CreateRuleInput) => Promise<RuleRecord>;
    update: (input: UpdateRuleInput) => Promise<RuleRecord>;
    remove: (input: DeleteRuleInput) => Promise<void>;
    reorder: (input: ReorderRulesInput) => Promise<RuleRecord[]>;
};
/** Production instance bound to the shared Prisma singleton. */
export declare const ruleService: {
    list: (input: ListRulesInput) => Promise<RuleRecord[]>;
    create: (input: CreateRuleInput) => Promise<RuleRecord>;
    update: (input: UpdateRuleInput) => Promise<RuleRecord>;
    remove: (input: DeleteRuleInput) => Promise<void>;
    reorder: (input: ReorderRulesInput) => Promise<RuleRecord[]>;
};
//# sourceMappingURL=rule.service.d.ts.map