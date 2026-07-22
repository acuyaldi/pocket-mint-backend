"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssistantApplicationService = createAssistantApplicationService;
const errors_1 = require("./errors");
const executor_1 = require("./executor");
const intent_1 = require("./intent");
const renderer_1 = require("./renderer");
const persistence_1 = require("./persistence");
const policy_1 = require("./policy");
const logger_1 = require("../utils/logger");
function createAssistantApplicationService(deps) {
    async function execute(userId, correlationId, request) {
        const locale = request.locale?.trim() || 'id-ID';
        if (request.conversationId)
            await deps.conversations.assertContinuable(userId, request.conversationId);
        const provided = (0, persistence_1.normalizeProvidedMessage)(request.message);
        let resolved;
        let validatedInput;
        try {
            resolved = (0, intent_1.resolveIntent)(request);
            const contract = deps.toolRegistry.get(resolved.toolId);
            if (!contract)
                throw errors_1.AssistantError.toolNotFound(resolved.toolId);
            validatedInput = contract.validateInput(resolved.arguments);
        }
        catch (error) {
            const operational = error instanceof errors_1.AssistantError ? error : errors_1.AssistantError.invalidRequest('request cannot be validated');
            const turn = await deps.conversations.beginTurn({ userId, conversationId: request.conversationId, correlationId, intent: request.intent, locale, content: (0, persistence_1.safeRejectedUserMessage)(), source: 'SAFE_REQUEST_SUMMARY' });
            await deps.conversations.finalizeRejected({ ...turn, content: operational.message, safeErrorCode: operational.code });
            return { httpStatus: operational.statusCode, response: { status: 'rejected', code: operational.code, message: operational.message, correlationId, ...turn } };
        }
        const turn = await deps.conversations.beginTurn({ userId, conversationId: request.conversationId, correlationId, intent: request.intent, locale, content: provided ?? (0, persistence_1.monthlySummaryFallback)(validatedInput), source: provided ? 'USER_PROVIDED' : 'CANONICAL_FALLBACK' });
        await deps.conversations.markTurnRunning(turn.turnId);
        const contract = deps.toolRegistry.get(resolved.toolId);
        const policy = (0, policy_1.evaluatePolicy)(contract);
        const executionId = await deps.conversations.beginToolExecution({ ...turn, correlationId, toolId: contract.id, capability: contract.capability, riskLevel: contract.riskLevel, policyDecision: policy.action, redactedInput: (0, persistence_1.monthlySummaryInputForAudit)(validatedInput) });
        const startedAt = Date.now();
        try {
            const result = await (0, executor_1.executeTool)(resolved.toolId, validatedInput, { userId, correlationId, ...turn, timestamp: new Date() }, deps.toolRegistry, deps.handlerRegistry);
            const renderedText = (0, renderer_1.renderMonthlySpendingSummary)(result.output);
            try {
                await deps.conversations.finalize({ executionId, ...turn, status: 'SUCCEEDED', turnStatus: 'SUCCEEDED', assistantContent: renderedText, assistantSource: 'DETERMINISTIC_RENDERER', durationMs: result.durationMs, outputSummary: (0, persistence_1.monthlySummaryOutputForAudit)(result.output) });
            }
            catch (error) {
                logger_1.logger.error('assistant_finalization_failed', { correlationId, conversationId: turn.conversationId, turnId: turn.turnId });
                await deps.conversations.recoverFailedFinalization(turn.turnId, executionId).catch(() => undefined);
                throw error;
            }
            return { httpStatus: 200, response: { status: 'success', renderedText, data: result.output, correlationId, ...turn } };
        }
        catch (error) {
            const operational = error instanceof errors_1.AssistantError ? error : { message: 'Assistant execution failed', statusCode: 500, code: 'ASSISTANT_EXECUTION_FAILED' };
            const status = operational.code === 'ASSISTANT_EXECUTION_TIMEOUT' ? 'TIMED_OUT'
                : operational.code === 'ASSISTANT_POLICY_DENIED' || operational.code === 'ASSISTANT_TOOL_DISABLED' ? 'DENIED'
                    : 'FAILED';
            await deps.conversations.finalize({ executionId, ...turn, status, turnStatus: 'FAILED', assistantContent: operational.message, assistantSource: 'SAFE_ERROR', durationMs: Date.now() - startedAt, safeErrorCode: operational.code }).catch(() => undefined);
            return { httpStatus: operational.statusCode, response: { status: 'error', code: operational.code, message: operational.message, correlationId, ...turn } };
        }
    }
    return { execute };
}
//# sourceMappingURL=application.service.js.map