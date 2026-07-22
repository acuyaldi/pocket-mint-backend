"use strict";
// ============================================================
// Rule matcher (Phase 20)
// ------------------------------------------------------------
// Deterministic, pure matching of a transaction description/type
// against a user's rules. No fuzzy matching, no scoring — first
// matching rule (by ascending priority) wins.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchRules = matchRules;
const categorization_1 = require("../categorization");
function compare(haystack, needle, operator) {
    if (needle.length === 0)
        return false;
    switch (operator) {
        case 'EQUALS':
            return haystack === needle;
        case 'CONTAINS':
            return haystack.includes(needle);
        case 'STARTS_WITH':
            return haystack.startsWith(needle);
        case 'ENDS_WITH':
            return haystack.endsWith(needle);
    }
}
/** Whether a single rule matches the given transaction input. */
function matchesRule(rule, input) {
    const value = rule.value.trim().toLowerCase();
    switch (rule.matchType) {
        case 'DESCRIPTION':
            return compare(input.description.trim().toLowerCase(), value, rule.operator);
        case 'MERCHANT':
            return compare((0, categorization_1.normalizeMerchant)(input.description), (0, categorization_1.normalizeMerchant)(rule.value), rule.operator);
        case 'TRANSACTION_TYPE':
            // Transaction type only ever makes sense as an equality check —
            // the stored operator is ignored for this matchType by design.
            return input.type.toLowerCase() === value;
    }
}
/**
 * Evaluate rules and return the first match. `rules` must already be
 * filtered to enabled rules and sorted by ascending priority — the
 * service layer owns that via the Prisma query, mirroring how
 * categorization.service.ts pre-filters candidates before calling
 * generateSuggestions().
 */
function matchRules(rules, input) {
    const trimmedDescription = input.description.trim();
    if (trimmedDescription.length === 0)
        return null;
    for (const rule of rules) {
        if (matchesRule(rule, { ...input, description: trimmedDescription })) {
            return {
                ruleId: rule.id,
                ruleName: rule.name,
                categoryId: rule.categoryId,
                categoryName: rule.categoryName,
                reason: `Matched by rule: "${rule.name}"`,
            };
        }
    }
    return null;
}
//# sourceMappingURL=ruleMatcher.js.map