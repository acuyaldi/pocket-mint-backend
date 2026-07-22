"use strict";
// ============================================================
// Assistant Core — domain errors
// ------------------------------------------------------------
// Follows the existing structural convention expected by
// forwardError.ts / error.middleware.ts: isOperational, statusCode,
// code. Compatible with the central error handler without importing
// Express types or HTTP helpers.
//
// All Assistant errors use the 4xx range so the central handler
// treats them as operational (safe message shown to client).
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantError = void 0;
class AssistantError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.isOperational = true;
        this.name = 'AssistantError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, AssistantError.prototype);
    }
    // -- Factory methods -------------------------------------------------------
    static toolNotFound(toolId) {
        return new AssistantError(`Tool not found: ${toolId}`, 404, 'ASSISTANT_TOOL_NOT_FOUND');
    }
    static toolDisabled(toolId) {
        return new AssistantError(`Tool is disabled: ${toolId}`, 403, 'ASSISTANT_TOOL_DISABLED');
    }
    static invalidInput(toolId, detail) {
        return new AssistantError(`Invalid input for tool "${toolId}": ${detail}`, 400, 'ASSISTANT_INVALID_INPUT');
    }
    static invalidOutput(toolId, detail) {
        return new AssistantError(`Invalid output from tool "${toolId}": ${detail}`, 500, 'ASSISTANT_INVALID_OUTPUT');
    }
    static duplicateRegistration(toolId) {
        return new AssistantError(`Duplicate tool registration: "${toolId}" is already registered`, 409, 'ASSISTANT_DUPLICATE_TOOL');
    }
    static policyDenied(toolId, reason) {
        return new AssistantError(`Policy denied tool "${toolId}": ${reason}`, 403, 'ASSISTANT_POLICY_DENIED');
    }
    static executionTimeout(toolId, timeoutMs) {
        return new AssistantError(`The Assistant stopped waiting for the tool result (${toolId}) after ${timeoutMs}ms. The underlying operation may still complete.`, 504, 'ASSISTANT_EXECUTION_TIMEOUT');
    }
    static invalidTimeout(toolId, timeoutMs) {
        return new AssistantError(`Tool "${toolId}" has invalid timeout: ${timeoutMs}ms (must be > 0)`, 500, 'ASSISTANT_INVALID_TIMEOUT');
    }
    static policyMismatch(toolId, detail) {
        return new AssistantError(`Policy inconsistency in tool "${toolId}": ${detail}`, 500, 'ASSISTANT_POLICY_MISMATCH');
    }
    static unsupportedIntent(intent) {
        return new AssistantError(`Unsupported intent: "${intent}"`, 400, 'ASSISTANT_UNSUPPORTED_INTENT');
    }
    static invalidRequest(detail) {
        return new AssistantError(`Invalid Assistant request: ${detail}`, 400, 'ASSISTANT_INVALID_REQUEST');
    }
    static conversationNotFound() {
        return new AssistantError('Conversation not found', 404, 'ASSISTANT_CONVERSATION_NOT_FOUND');
    }
    static conversationNotContinuable() {
        return new AssistantError('Conversation cannot be continued', 409, 'ASSISTANT_CONVERSATION_NOT_CONTINUABLE');
    }
    static invalidIdempotencyKey() {
        return new AssistantError('Idempotency-Key must use 1-128 safe characters', 400, 'ASSISTANT_INVALID_IDEMPOTENCY_KEY');
    }
    static draftNotFound() {
        return new AssistantError('Financial draft not found', 404, 'ASSISTANT_DRAFT_NOT_FOUND');
    }
    static draftConflict(status) {
        return new AssistantError(`Financial draft cannot perform this operation from ${status}`, 409, 'ASSISTANT_DRAFT_CONFLICT');
    }
    static idempotencyConflict() {
        return new AssistantError('Idempotency key is already bound to another operation', 409, 'ASSISTANT_IDEMPOTENCY_CONFLICT');
    }
}
exports.AssistantError = AssistantError;
//# sourceMappingURL=errors.js.map