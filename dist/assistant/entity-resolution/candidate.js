"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntityCandidate = createEntityCandidate;
exports.revalidateEntityCandidate = revalidateEntityCandidate;
const errors_1 = require("./errors");
const normalization_1 = require("./normalization");
const types_1 = require("./types");
function boundedNonEmpty(value, maxBytes) {
    return typeof value === 'string'
        && value.length > 0
        && Buffer.byteLength(value, 'utf8') <= maxBytes
        && !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value);
}
function safeDisplay(value, maxBytes) {
    return boundedNonEmpty(value, maxBytes) && !/[<>]/u.test(value);
}
function createEntityCandidate(input) {
    if (!(0, types_1.isEntityType)(input.entityType)
        || !boundedNonEmpty(input.internalId, 191)
        || !boundedNonEmpty(input.stableTieBreakKey, 191)
        || !safeDisplay(input.displayLabel, types_1.ENTITY_RESOLUTION_LIMITS.displayLabelBytes)
        || input.aliases.length > types_1.ENTITY_RESOLUTION_LIMITS.aliasesPerCandidate
        || typeof input.trustedMetadata !== 'object'
        || input.trustedMetadata === null
        || Array.isArray(input.trustedMetadata)) {
        throw errors_1.EntityResolutionError.configuration();
    }
    const canonical = (0, normalization_1.normalizeEntityReference)(input.canonicalLabel);
    if (!canonical.ok)
        throw errors_1.EntityResolutionError.configuration();
    const aliases = input.aliases.map((alias) => {
        if (Buffer.byteLength(alias, 'utf8') > types_1.ENTITY_RESOLUTION_LIMITS.aliasBytes) {
            throw errors_1.EntityResolutionError.configuration();
        }
        const normalized = (0, normalization_1.normalizeEntityReference)(alias);
        if (!normalized.ok)
            throw errors_1.EntityResolutionError.configuration();
        return normalized;
    });
    const orderedAliases = [...aliases].sort((left, right) => compareText(left.normalized, right.normalized)
        || compareText(left.comparison, right.comparison));
    if (input.discriminator !== undefined
        && !safeDisplay(input.discriminator, types_1.ENTITY_RESOLUTION_LIMITS.displayLabelBytes)) {
        throw errors_1.EntityResolutionError.configuration();
    }
    return Object.freeze({
        entityType: input.entityType,
        internalId: input.internalId,
        displayLabel: input.displayLabel,
        canonicalLabel: input.canonicalLabel,
        canonicalComparison: canonical.comparison,
        normalizedCanonicalLabel: canonical.normalized,
        aliases: Object.freeze(orderedAliases.map((alias) => alias.sourceText)),
        normalizedAliases: Object.freeze(orderedAliases.map((alias) => alias.normalized)),
        aliasComparisons: Object.freeze(orderedAliases.map((alias) => alias.comparison)),
        ...(input.discriminator === undefined ? {} : { discriminator: input.discriminator }),
        trustedMetadata: Object.freeze({ ...input.trustedMetadata }),
        stableTieBreakKey: input.stableTieBreakKey,
    });
}
function revalidateEntityCandidate(value) {
    try {
        return createEntityCandidate({
            entityType: value.entityType,
            internalId: value.internalId,
            displayLabel: value.displayLabel,
            canonicalLabel: value.canonicalLabel,
            aliases: value.aliases,
            ...(value.discriminator === undefined ? {} : { discriminator: value.discriminator }),
            trustedMetadata: value.trustedMetadata,
            stableTieBreakKey: value.stableTieBreakKey,
        });
    }
    catch {
        throw errors_1.EntityResolutionError.configuration();
    }
}
function compareText(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}
//# sourceMappingURL=candidate.js.map