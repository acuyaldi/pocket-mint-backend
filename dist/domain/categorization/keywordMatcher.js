"use strict";
// ============================================================
// Keyword matcher
// ------------------------------------------------------------
// Deterministic matching of normalized merchant text against
// category keyword sets. Returns ranked matches with match
// metadata for confidence calculation.
//
// Match types (in priority order):
// 1. EXACT — normalized description matches a keyword exactly
// 2. CONTAINS — normalized description contains a keyword
// 3. TOKEN — an individual token matches a keyword
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMatches = findMatches;
/**
 * Score a single candidate against a normalized description and its tokens.
 * Returns all keyword matches found, or empty array if none.
 */
function matchCandidate(normalized, tokens, candidate) {
    const matches = [];
    for (const keyword of candidate.keywords) {
        const kw = keyword.toLowerCase();
        // EXACT: full normalized description equals the keyword
        if (normalized === kw) {
            matches.push({
                categoryId: candidate.categoryId,
                categoryName: candidate.categoryName,
                keyword,
                kind: 'EXACT',
            });
            continue;
        }
        // CONTAINS: normalized description contains the keyword as a substring
        if (normalized.includes(kw)) {
            matches.push({
                categoryId: candidate.categoryId,
                categoryName: candidate.categoryName,
                keyword,
                kind: 'CONTAINS',
            });
            continue;
        }
        // TOKEN: an individual token (word) matches the keyword
        if (tokens.some((t) => t === kw)) {
            matches.push({
                categoryId: candidate.categoryId,
                categoryName: candidate.categoryName,
                keyword,
                kind: 'TOKEN',
            });
        }
    }
    return matches;
}
/**
 * Find all keyword matches across all candidates for a normalized description.
 * Matches are pre-grouped by category; the caller ranks them.
 */
function findMatches(normalized, tokens, candidates) {
    const allMatches = [];
    for (const candidate of candidates) {
        allMatches.push(...matchCandidate(normalized, tokens, candidate));
    }
    return allMatches;
}
//# sourceMappingURL=keywordMatcher.js.map