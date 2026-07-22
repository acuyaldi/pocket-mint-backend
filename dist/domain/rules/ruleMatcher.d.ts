import type { RuleCandidate, RuleMatch, RuleMatchInput } from './types';
/**
 * Evaluate rules and return the first match. `rules` must already be
 * filtered to enabled rules and sorted by ascending priority — the
 * service layer owns that via the Prisma query, mirroring how
 * categorization.service.ts pre-filters candidates before calling
 * generateSuggestions().
 */
export declare function matchRules(rules: RuleCandidate[], input: RuleMatchInput): RuleMatch | null;
//# sourceMappingURL=ruleMatcher.d.ts.map