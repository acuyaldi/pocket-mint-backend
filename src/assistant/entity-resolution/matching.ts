import {
  ENTITY_RESOLUTION_LIMITS,
  type EntityCandidate,
  type EntityConfidence,
  type EntityMatchEvidence,
  type NormalizedEntityReference,
} from './types';
import { EntityResolutionError } from './errors';

const EVIDENCE_SCORES = Object.freeze({
  canonical_exact: 1000,
  alias_exact: 950,
  normalized_exact: 900,
  constrained_match: 0,
  no_match: 0,
});

const EVIDENCE_ORDER: Readonly<Record<EntityMatchEvidence['kind'], number>> = Object.freeze({
  canonical_exact: 0,
  alias_exact: 1,
  normalized_exact: 2,
  constrained_match: 3,
  no_match: 4,
});

export function matchEntityCandidate(
  candidate: EntityCandidate,
  reference: NormalizedEntityReference,
  options: { readonly constrained?: boolean } = {},
): readonly EntityMatchEvidence[] {
  let kind: EntityMatchEvidence['kind'] = 'no_match';
  if (reference.comparison === candidate.canonicalComparison) {
    kind = 'canonical_exact';
  } else if (candidate.aliasComparisons.includes(reference.comparison)) {
    kind = 'alias_exact';
  } else if (
    reference.normalized === candidate.normalizedCanonicalLabel
    || candidate.normalizedAliases.includes(reference.normalized)
  ) {
    kind = 'normalized_exact';
  }

  const evidence: EntityMatchEvidence[] = [{
    kind,
    scoreContribution: EVIDENCE_SCORES[kind],
  }];
  if (options.constrained && kind !== 'no_match') {
    evidence.push({ kind: 'constrained_match', scoreContribution: 0 });
  }
  return Object.freeze(evidence);
}

export function normalizeEvidence(
  evidence: readonly EntityMatchEvidence[],
): readonly EntityMatchEvidence[] {
  if (evidence.length > ENTITY_RESOLUTION_LIMITS.evidencePerCandidate) {
    throw EntityResolutionError.configuration();
  }
  const validated = evidence.map((item) => {
    if (
      !(item.kind in EVIDENCE_SCORES)
      || !Number.isSafeInteger(item.scoreContribution)
      || item.scoreContribution !== EVIDENCE_SCORES[item.kind]
    ) {
      throw EntityResolutionError.configuration();
    }
    return Object.freeze({ kind: item.kind, scoreContribution: item.scoreContribution });
  });
  return Object.freeze(validated.sort(
    (left, right) => EVIDENCE_ORDER[left.kind] - EVIDENCE_ORDER[right.kind],
  ));
}

export function confidenceFromEvidence(
  evidence: readonly EntityMatchEvidence[],
): EntityConfidence {
  const score = evidence.reduce(
    (highest, item) => Math.max(highest, item.scoreContribution),
    0,
  );
  const band: EntityConfidence['band'] = score === 1000
    ? 'exact'
    : score >= 900
      ? 'strong'
      : score > 0
        ? 'possible'
        : 'none';
  return Object.freeze({ score, band });
}
