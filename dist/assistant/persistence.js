"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAFE_REJECTED_INTENT = exports.MAX_ASSISTANT_MESSAGE_LENGTH = void 0;
exports.assertAssistantMessageLength = assertAssistantMessageLength;
exports.normalizeProvidedMessage = normalizeProvidedMessage;
exports.safeRejectedUserMessage = safeRejectedUserMessage;
exports.safeRejectedAssistantMessage = safeRejectedAssistantMessage;
exports.monthlySummaryFallback = monthlySummaryFallback;
exports.monthlySummaryInputForAudit = monthlySummaryInputForAudit;
exports.monthlySummaryOutputForAudit = monthlySummaryOutputForAudit;
const errors_1 = require("./errors");
exports.MAX_ASSISTANT_MESSAGE_LENGTH = 10000;
const SAFE_REJECTED_MESSAGE = 'Permintaan Assistant tidak dapat diproses.';
exports.SAFE_REJECTED_INTENT = 'unresolved';
function assertAssistantMessageLength(content) {
    if (content.length > exports.MAX_ASSISTANT_MESSAGE_LENGTH) {
        throw errors_1.AssistantError.invalidRequest(`message must not exceed ${exports.MAX_ASSISTANT_MESSAGE_LENGTH} characters`);
    }
    return content;
}
function normalizeProvidedMessage(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== 'string') {
        throw errors_1.AssistantError.invalidRequest('message must be a string');
    }
    const content = value.trim();
    if (!content)
        return undefined;
    return assertAssistantMessageLength(content);
}
function safeRejectedUserMessage() {
    return SAFE_REJECTED_MESSAGE;
}
function safeRejectedAssistantMessage(code) {
    if (code === 'ASSISTANT_UNSUPPORTED_INTENT')
        return 'Assistant intent is not supported.';
    if (code === 'ASSISTANT_INVALID_INPUT' || code === 'ASSISTANT_INVALID_REQUEST')
        return 'Assistant request is invalid.';
    return 'Assistant request could not be processed.';
}
function monthlySummaryFallback(input) {
    return `analytics.monthly-spending-summary(month=${input.month})`;
}
function monthlySummaryInputForAudit(input) {
    return { month: input.month };
}
function monthlySummaryOutputForAudit(output) {
    return {
        month: output.month,
        transactionCount: output.transactionCount,
        categoryCount: output.topCategories.length,
    };
}
//# sourceMappingURL=persistence.js.map