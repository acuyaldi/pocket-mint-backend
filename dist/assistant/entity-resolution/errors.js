"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolutionError = void 0;
class EntityResolutionError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.name = 'EntityResolutionError';
        Object.setPrototypeOf(this, EntityResolutionError.prototype);
    }
    static candidateLimitExceeded() {
        return new EntityResolutionError('Entity resolution candidate limit exceeded.', 413, 'ENTITY_RESOLUTION_CANDIDATE_LIMIT_EXCEEDED');
    }
    static configuration() {
        return new EntityResolutionError('Entity resolution configuration is invalid.', 500, 'ENTITY_RESOLUTION_CONFIGURATION_ERROR');
    }
    static failed() {
        return new EntityResolutionError('Entity resolution failed safely.', 500, 'ENTITY_RESOLUTION_FAILED');
    }
}
exports.EntityResolutionError = EntityResolutionError;
//# sourceMappingURL=errors.js.map