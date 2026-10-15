// ============================================================
// Confidence calculator
// ------------------------------------------------------------
// Deterministic, explainable confidence scoring for category
// suggestions. Never generates arbitrary percentages — always
// derived from match quality.
//
// Confidence rules:
//
// HIGH confidence:
//   - Exact merchant alias match (e.g. "indomaret" → Belanja)
//   Evidence: the normalized description identically matches
//   a known keyword.
//
// MEDIUM confidence:
//   - Keyword contains match (e.g. "alfamart serpong" contains
//     "alfamart" → Belanja)
//   - Multiple token matches for the same category
//   Evidence: a meaningful substring of the description matches
//   a known keyword.
//
// LOW confidence:
//   - Single token match (e.g. "bakso" in "makan bakso enak"
//     matching "makan" → Makanan)
//   - Weak partial match
//   Evidence: an individual word matches, but the description
//   may refer to something else.
// ============================================================

import type { ConfidenceLevel } from './types';
import type { KeywordMatch, MatchKind } from './keywordMatcher';

/** Maps a match kind to its base confidence level. */
const KIND_CONFIDENCE: Record<MatchKind, ConfidenceLevel> = {
  EXACT: 'HIGH',
  CONTAINS: 'MEDIUM',
  TOKEN: 'LOW',
};

export interface ScoredMatch {
  categoryId: string;
  categoryName: string;
  confidence: ConfidenceLevel;
  /** The strongest individual match that contributed to this score. */
  bestMatch: KeywordMatch;
  /** Why this confidence level was assigned. */
  reason: string;
}

/**
 * Group matches by category and select the best match per category.
 * Confidence is determined by the strongest match kind.
 */
function groupByCategory(matches: KeywordMatch[]): Map<string, KeywordMatch[]> {
  const grouped = new Map<string, KeywordMatch[]>();
  for (const m of matches) {
    const existing = grouped.get(m.categoryId);
    if (existing) {
      existing.push(m);
    } else {
      grouped.set(m.categoryId, [m]);
    }
  }
  return grouped;
}

/** Pick the strongest match from a group (EXACT > CONTAINS > TOKEN). */
function pickBest(matches: KeywordMatch[]): KeywordMatch {
  // Sort by kind priority
  const priority: Record<MatchKind, number> = { EXACT: 0, CONTAINS: 1, TOKEN: 2 };
  return matches.sort((a, b) => priority[a.kind] - priority[b.kind])[0];
}

/**
 * Compute confidence for a group of matches belonging to one category.
 *
 * Confidence is based on the strongest match kind. Multiple matches of
 * the same kind do not escalate the confidence — a single strong match
 * is already the best signal we have.
 */
function computeConfidence(categoryMatches: KeywordMatch[]): { confidence: ConfidenceLevel; reason: string } {
  const best = pickBest(categoryMatches);
  const confidence = KIND_CONFIDENCE[best.kind];

  const reason = (() => {
    switch (best.kind) {
      case 'EXACT':
        return `Exact match: "${best.keyword}"`;
      case 'CONTAINS':
        return `Description contains: "${best.keyword}"`;
      case 'TOKEN':
        return `Word matches: "${best.keyword}"`;
    }
  })();

  return { confidence, reason };
}

/**
 * Score and rank all keyword matches into confidence-assigned suggestions.
 * Results are ordered: HIGH → MEDIUM → LOW, then alphabetically by
 * category name within each tier.
 */
export function scoreMatches(matches: KeywordMatch[]): ScoredMatch[] {
  if (matches.length === 0) return [];

  const grouped = groupByCategory(matches);
  const scored: ScoredMatch[] = [];

  for (const [, categoryMatches] of grouped) {
    const best = pickBest(categoryMatches);
    const { confidence, reason } = computeConfidence(categoryMatches);

    scored.push({
      categoryId: best.categoryId,
      categoryName: best.categoryName,
      confidence,
      bestMatch: best,
      reason,
    });
  }

  // Sort: confidence tier first, then alphabetically
  const tierOrder: Record<ConfidenceLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  scored.sort(
    (a, b) =>
      tierOrder[a.confidence] - tierOrder[b.confidence] ||
      a.categoryName.localeCompare(b.categoryName),
  );

  return scored;
}
