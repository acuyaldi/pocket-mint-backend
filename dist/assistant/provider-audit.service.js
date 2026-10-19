"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssistantProviderAuditService = createAssistantProviderAuditService;
const prismaErrors_1 = require("../utils/prismaErrors");
const errors_1 = require("./errors");
const conversation_service_1 = require("./conversation.service");
const logger_1 = require("../utils/logger");
function createAssistantProviderAuditService(db) {
    async function begin(input) {
        // P2003: the conversation was deleted after it was established (Phase 38.2).
        const row = await (0, prismaErrors_1.withPrismaErrorTranslation)(() => db.assistantProviderExecution.create({ data: input, select: { id: true } }), { P2003: () => errors_1.AssistantError.conversationNotFound() });
        return row.id;
    }
    async function finalize(id, input) {
        // Phase 37.4 — AssistantProviderExecution.conversationId cascades from
        // AssistantConversation, so a concurrent deleteOwnedConversation can
        // delete this row between the provider call starting and finishing.
        // Audit bookkeeping must never fail an otherwise-successful request —
        // same no-op-and-log decision as the turn-finalize family in
        // conversation.service.ts (docs/assistant-stuck-states.md).
        //
        // Phase 38.2 — the update sets turn_id, so on its own it would lock this
        // row and THEN key-share the turn, the reverse of the delete's
        // conversation → turn → execution cascade (observed deadlock). Conversation
        // lock first (lock order, conversation.service.ts's lockConversation).
        const skip = () => (0, logger_1.logEvent)('warn', { event: 'assistant.conversation_race_skip', stage: 'providerAudit.finalize', executionId: id, turnId: input.turnId });
        await (0, prismaErrors_1.withPrismaErrorSwallowed)(() => db.$transaction(async (tx) => {
            const row = await tx.assistantProviderExecution.findUnique({ where: { id }, select: { conversationId: true } });
            if (!row || await (0, conversation_service_1.lockConversation)(tx, row.conversationId) === undefined)
                return skip();
            await tx.assistantProviderExecution.update({
                where: { id },
                data: {
                    status: input.status,
                    turnId: input.turnId,
                    completedAt: new Date(),
                    durationMs: input.durationMs,
                    outputBytes: input.outputBytes,
                    finishClassification: input.finishClassification,
                    safeErrorCode: input.safeErrorCode,
                    inputTokens: input.usage?.inputTokens,
                    outputTokens: input.usage?.outputTokens,
                    totalTokens: input.usage?.totalTokens,
                    cachedInputTokens: input.usage?.cachedInputTokens,
                },
            });
        }), { P2025: skip });
    }
    return { begin, finalize };
}
//# sourceMappingURL=provider-audit.service.js.map