"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSISTANT_MESSAGE_MAX_LENGTH = void 0;
exports.normalizeProvidedMessage = normalizeProvidedMessage;
exports.safeRejectedUserMessage = safeRejectedUserMessage;
exports.monthlySummaryFallback = monthlySummaryFallback;
exports.monthlySummaryInputForAudit = monthlySummaryInputForAudit;
exports.monthlySummaryOutputForAudit = monthlySummaryOutputForAudit;
const errors_1 = require("./errors");
exports.ASSISTANT_MESSAGE_MAX_LENGTH = 100000;
const SAFE_REJECTED_MESSAGE = 'Permintaan Assistant tidak dapat diproses.';
function normalizeProvidedMessage(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== 'string') {
        throw errors_1.AssistantError.invalidRequest('message must be a string');
    }
    const content = value.trim();
    if (!content)
        return undefined;
    if (content.length > exports.ASSISTANT_MESSAGE_MAX_LENGTH) {
        throw errors_1.AssistantError.invalidRequest(`message must not exceed ${exports.ASSISTANT_MESSAGE_MAX_LENGTH} characters`);
    }
    return content;
}
function safeRejectedUserMessage() {
    return SAFE_REJECTED_MESSAGE;
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