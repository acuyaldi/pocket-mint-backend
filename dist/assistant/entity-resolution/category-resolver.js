"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCategoryTransactionCreateConstraints = createCategoryTransactionCreateConstraints;
exports.createCategoryResolver = createCategoryResolver;
const candidate_1 = require("./candidate");
const errors_1 = require("./errors");
const matching_1 = require("./matching");
const types_1 = require("./types");
function createCategoryTransactionCreateConstraints(transactionType) {
    return Object.freeze({
        eligibleFor: 'transaction.create',
        transactionType,
    });
}
function isTransactionCreateConstraints(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return false;
    const keys = Object.keys(value).sort();
    return keys.length === 2
        && keys[0] === 'eligibleFor'
        && keys[1] === 'transactionType'
        && value.eligibleFor === 'transaction.create'
        && (value.transactionType === 'INCOME' || value.transactionType === 'EXPENSE');
}
function createCategoryResolver(db) {
    const resolver = {
        entityType: 'category',
        async loadCandidates(scope) {
            const { authenticatedUserId, trustedConstraints } = scope;
            if (!isTransactionCreateConstraints(trustedConstraints)) {
                throw errors_1.EntityResolutionError.configuration();
            }
            const categories = await db.category.findMany({
                where: {
                    userId: authenticatedUserId,
                    type: trustedConstraints.transactionType,
                },
                select: {
                    id: true,
                    name: true,
                    type: true,
                },
                take: types_1.ENTITY_RESOLUTION_LIMITS.candidates + 1,
            });
            return categories.map((category) => {
                if (category.type !== trustedConstraints.transactionType) {
                    throw errors_1.EntityResolutionError.configuration();
                }
                return (0, candidate_1.createEntityCandidate)({
                    entityType: 'category',
                    internalId: category.id,
                    displayLabel: category.name,
                    canonicalLabel: category.name,
                    aliases: [],
                    discriminator: category.type,
                    trustedMetadata: {
                        type: category.type,
                        eligibleFor: trustedConstraints.eligibleFor,
                    },
                    stableTieBreakKey: category.id,
                });
            });
        },
        matchCandidate(input) {
            const { candidate, reference, trustedConstraints } = input;
            if (!isTransactionCreateConstraints(trustedConstraints)
                || candidate.trustedMetadata.eligibleFor !== trustedConstraints.eligibleFor
                || candidate.trustedMetadata.type !== trustedConstraints.transactionType
                || candidate.aliases.length !== 0) {
                throw errors_1.EntityResolutionError.configuration();
            }
            return (0, matching_1.matchEntityCandidate)(candidate, reference, { constrained: true });
        },
    };
    return Object.freeze(resolver);
}
//# sourceMappingURL=category-resolver.js.map