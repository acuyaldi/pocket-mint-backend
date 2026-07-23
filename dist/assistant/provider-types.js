"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSISTANT_RESPONSE_JSON_SCHEMA = exports.AssistantProviderError = void 0;
class AssistantProviderError extends Error {
    constructor(code, message, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = true;
        this.name = 'AssistantProviderError';
    }
    static invalidResponse() {
        return new AssistantProviderError('ASSISTANT_PROVIDER_INVALID_RESPONSE', 'Assistant provider returned an invalid response.', 502);
    }
    static timeout() {
        return new AssistantProviderError('ASSISTANT_PROVIDER_TIMEOUT', 'Assistant provider request timed out.', 504);
    }
    static unavailable() {
        return new AssistantProviderError('ASSISTANT_PROVIDER_UNAVAILABLE', 'Assistant provider is temporarily unavailable.', 503);
    }
    static rateLimited() {
        return new AssistantProviderError('ASSISTANT_PROVIDER_RATE_LIMITED', 'Assistant provider is temporarily rate limited.', 429);
    }
    static configuration() {
        return new AssistantProviderError('ASSISTANT_PROVIDER_CONFIGURATION_ERROR', 'Assistant provider configuration is invalid.', 503);
    }
    static refused() {
        return new AssistantProviderError('ASSISTANT_PROVIDER_REFUSED', 'Assistant provider could not process the request safely.', 422);
    }
}
exports.AssistantProviderError = AssistantProviderError;
exports.ASSISTANT_RESPONSE_JSON_SCHEMA = Object.freeze({
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'intent', 'arguments', 'clarification', 'userMessage'],
    properties: {
        kind: { type: 'string', enum: ['intent', 'clarification', 'unsupported'] },
        intent: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        arguments: { type: 'object' },
        clarification: {
            anyOf: [
                { type: 'null' },
                {
                    type: 'object',
                    additionalProperties: false,
                    required: ['question'],
                    properties: { question: { type: 'string', maxLength: 500 } },
                },
            ],
        },
        userMessage: { type: 'string', maxLength: 2000 },
    },
});
//# sourceMappingURL=provider-types.js.map