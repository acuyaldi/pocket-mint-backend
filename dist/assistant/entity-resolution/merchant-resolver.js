"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MERCHANT_TRANSACTION_CREATE_CONSTRAINTS = void 0;
exports.createMerchantResolver = createMerchantResolver;
const candidate_1 = require("./candidate");
const errors_1 = require("./errors");
const matching_1 = require("./matching");
const types_1 = require("./types");
exports.MERCHANT_TRANSACTION_CREATE_CONSTRAINTS = Object.freeze({
    eligibleFor: 'transaction.create',
});
function isTransactionCreateConstraints(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const keys = Object.keys(value);
    return keys.length === 1
        && keys[0] === 'eligibleFor'
        && value.eligibleFor === 'transaction.create';
}
function trustedNormalizedAlias(normalizedMerchant) {
    if (typeof normalizedMerchant !== 'string'
        || normalizedMerchant.length === 0
        || Buffer.byteLength(normalizedMerchant, 'utf8')
            > types_1.ENTITY_RESOLUTION_LIMITS.aliasBytes) {
        throw errors_1.EntityResolutionError.configuration();
    }
    return Object.freeze([normalizedMerchant]);
}
function createMerchantResolver(db) {
    const resolver = {
        entityType: 'merchant',
        async loadCandidates(scope) {
            const { authenticatedUserId, trustedConstraints } = scope;
            if (!isTransactionCreateConstraints(trustedConstraints)) {
                throw errors_1.EntityResolutionError.configuration();
            }
            const mappings = await db.merchantMapping.findMany({
                where: { userId: authenticatedUserId },
                select: {
                    id: true,
                    merchantName: true,
                    normalizedMerchant: true,
                },
                take: types_1.ENTITY_RESOLUTION_LIMITS.candidates + 1,
            });
            return mappings.map((mapping) => (0, candidate_1.createEntityCandidate)({
                entityType: 'merchant',
                internalId: mapping.id,
                displayLabel: mapping.merchantName,
                canonicalLabel: mapping.merchantName,
                aliases: trustedNormalizedAlias(mapping.normalizedMerchant),
                trustedMetadata: {
                    normalizedMerchant: mapping.normalizedMerchant,
                    eligibleFor: trustedConstraints.eligibleFor,
                },
                stableTieBreakKey: mapping.id,
            }));
        },
        matchCandidate(input) {
            const { candidate, reference, trustedConstraints } = input;
            if (!isTransactionCreateConstraints(trustedConstraints)
                || candidate.trustedMetadata.eligibleFor !== trustedConstraints.eligibleFor
                || typeof candidate.trustedMetadata.normalizedMerchant !== 'string') {
                throw errors_1.EntityResolutionError.configuration();
            }
            return (0, matching_1.matchEntityCandidate)(candidate, reference, { constrained: true });
        },
    };
    return Object.freeze(resolver);
}
//# sourceMappingURL=merchant-resolver.js.map