"use strict";
// ============================================================
// Suggestion engine
// ------------------------------------------------------------
// Main orchestrator for deterministic category suggestion.
// Pure function: takes input + candidates → returns ranked
// suggestions. No I/O, no Prisma, no side effects.
//
// Flow:
//   1. Normalize merchant/description text
//   2. Extract keyword tokens
//   3. Match against candidate category keyword sets
//   4. Score confidence
//   5. Return ranked suggestions
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSuggestions = generateSuggestions;
const merchantNormalizer_1 = require("./merchantNormalizer");
const keywordMatcher_1 = require("./keywordMatcher");
const confidenceCalculator_1 = require("./confidenceCalculator");
/**
 * Produce ranked category suggestions for a transaction description.
 *
 * Returns up to 5 suggestions, ordered by confidence (HIGH → MEDIUM → LOW)
 * then alphabetically by category name.
 *
 * Returns empty array when no keywords match.
 */
function generateSuggestions(input) {
    if (!input.description || input.description.trim().length === 0) {
        return [];
    }
    if (input.candidates.length === 0) {
        return [];
    }
    const { normalized, tokens } = (0, merchantNormalizer_1.prepareForMatching)(input);
    if (normalized.length === 0) {
        return [];
    }
    const matches = (0, keywordMatcher_1.findMatches)(normalized, tokens, input.candidates);
    const scored = (0, confidenceCalculator_1.scoreMatches)(matches);
    return scored.slice(0, 5).map((s) => ({
        categoryId: s.categoryId,
        categoryName: s.categoryName,
        confidence: s.confidence,
        reason: s.reason,
        matchedKeyword: s.bestMatch.keyword,
        normalizedMerchant: normalized,
    }));
}
//# sourceMappingURL=suggestionEngine.js.map