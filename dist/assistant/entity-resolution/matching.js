"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchEntityCandidate = matchEntityCandidate;
exports.normalizeEvidence = normalizeEvidence;
exports.confidenceFromEvidence = confidenceFromEvidence;
const types_1 = require("./types");
const errors_1 = require("./errors");
const EVIDENCE_SCORES = Object.freeze({
    canonical_exact: 1000,
    alias_exact: 950,
    normalized_exact: 900,
    constrained_match: 0,
    no_match: 0,
});
const EVIDENCE_ORDER = Object.freeze({
    canonical_exact: 0,
    alias_exact: 1,
    normalized_exact: 2,
    constrained_match: 3,
    no_match: 4,
});
function matchEntityCandidate(candidate, reference, options = {}) {
    let kind = 'no_match';
    if (reference.comparison === candidate.canonicalComparison) {
        kind = 'canonical_exact';
    }
    else if (candidate.aliasComparisons.includes(reference.comparison)) {
        kind = 'alias_exact';
    }
    else if (reference.normalized === candidate.normalizedCanonicalLabel
        || candidate.normalizedAliases.includes(reference.normalized)) {
        kind = 'normalized_exact';
    }
    const evidence = [{
            kind,
            scoreContribution: EVIDENCE_SCORES[kind],
        }];
    if (options.constrained && kind !== 'no_match') {
        evidence.push({ kind: 'constrained_match', scoreContribution: 0 });
    }
    return Object.freeze(evidence);
}
function normalizeEvidence(evidence) {
    if (evidence.length > types_1.ENTITY_RESOLUTION_LIMITS.evidencePerCandidate) {
        throw errors_1.EntityResolutionError.configuration();
    }
    const validated = evidence.map((item) => {
        if (!(item.kind in EVIDENCE_SCORES)
            || !Number.isSafeInteger(item.scoreContribution)
            || item.scoreContribution !== EVIDENCE_SCORES[item.kind]) {
            throw errors_1.EntityResolutionError.configuration();
        }
        return Object.freeze({ kind: item.kind, scoreContribution: item.scoreContribution });
    });
    return Object.freeze(validated.sort((left, right) => EVIDENCE_ORDER[left.kind] - EVIDENCE_ORDER[right.kind]));
}
function confidenceFromEvidence(evidence) {
    const score = evidence.reduce((highest, item) => Math.max(highest, item.scoreContribution), 0);
    const band = score === 1000
        ? 'exact'
        : score >= 900
            ? 'strong'
            : score > 0
                ? 'possible'
                : 'none';
    return Object.freeze({ score, band });
}
//# sourceMappingURL=matching.js.map