"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolverRegistry = void 0;
const errors_1 = require("./errors");
const types_1 = require("./types");
class EntityResolverRegistry {
    constructor() {
        this.resolvers = new Map();
        this.finalized = false;
    }
    register(resolver) {
        if (this.finalized
            || !resolver
            || !(0, types_1.isEntityType)(resolver.entityType)
            || typeof resolver.loadCandidates !== 'function'
            || typeof resolver.matchCandidate !== 'function'
            || this.resolvers.has(resolver.entityType)) {
            throw errors_1.EntityResolutionError.configuration();
        }
        const stored = Object.freeze({
            entityType: resolver.entityType,
            loadCandidates: resolver.loadCandidates.bind(resolver),
            matchCandidate: resolver.matchCandidate.bind(resolver),
        });
        this.resolvers.set(stored.entityType, stored);
    }
    get(entityType) {
        return (0, types_1.isEntityType)(entityType) ? this.resolvers.get(entityType) : undefined;
    }
    registeredTypes() {
        return Object.freeze([...this.resolvers.keys()].sort(compareText));
    }
    finalize() {
        this.finalized = true;
    }
    get isFinalized() {
        return this.finalized;
    }
}
exports.EntityResolverRegistry = EntityResolverRegistry;
function compareText(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}
//# sourceMappingURL=registry.js.map