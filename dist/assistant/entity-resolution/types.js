"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTITY_RESOLUTION_POLICY = exports.ENTITY_RESOLUTION_LIMITS = exports.ENTITY_REFERENCE_SOURCES = exports.ENTITY_TYPES = void 0;
exports.isEntityType = isEntityType;
exports.ENTITY_TYPES = ['wallet', 'merchant', 'category'];
exports.ENTITY_REFERENCE_SOURCES = [
    'user_text',
    'provider_extracted',
    'deterministic_rule',
    'system_constraint',
];
exports.ENTITY_RESOLUTION_LIMITS = Object.freeze({
    sourceReferenceBytes: 256,
    normalizedReferenceBytes: 256,
    candidates: 100,
    aliasesPerCandidate: 16,
    aliasBytes: 128,
    evidencePerCandidate: 4,
    ambiguityOptions: 5,
    displayLabelBytes: 128,
    conversationReferenceBytes: 128,
});
exports.ENTITY_RESOLUTION_POLICY = Object.freeze({
    resolutionThreshold: 900,
    ambiguityMargin: 50,
    confidenceMaximum: 1000,
});
function isEntityType(value) {
    return typeof value === 'string' && exports.ENTITY_TYPES.includes(value);
}
//# sourceMappingURL=types.js.map