export type RuleMatchType = 'DESCRIPTION' | 'MERCHANT' | 'TRANSACTION_TYPE';
export type RuleOperator = 'CONTAINS' | 'EQUALS' | 'STARTS_WITH' | 'ENDS_WITH';
export type RuleTransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export interface RuleCandidate {
    id: string;
    name: string;
    matchType: RuleMatchType;
    operator: RuleOperator;
    value: string;
    categoryId: string;
    categoryName: string;
}
export interface RuleMatchInput {
    description: string;
    type: RuleTransactionType;
}
export interface RuleMatch {
    ruleId: string;
    ruleName: string;
    categoryId: string;
    categoryName: string;
    reason: string;
}
//# sourceMappingURL=types.d.ts.map