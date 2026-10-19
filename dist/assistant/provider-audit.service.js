"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssistantProviderAuditService = createAssistantProviderAuditService;
const prismaErrors_1 = require("../utils/prismaErrors");
const logger_1 = require("../utils/logger");
function createAssistantProviderAuditService(db) {
    async function begin(input) {
        const row = await db.assistantProviderExecution.create({
            data: input,
            select: { id: true },
        });
        return row.id;
    }
    async function finalize(id, input) {
        // Phase 37.4 — AssistantProviderExecution.conversationId cascades from
        // AssistantConversation, so a concurrent deleteOwnedConversation can
        // delete this row between the provider call starting and finishing.
        // Audit bookkeeping must never fail an otherwise-successful request —
        // same no-op-and-log decision as the turn-finalize family in
        // conversation.service.ts (docs/assistant-stuck-states.md).
        await (0, prismaErrors_1.withPrismaErrorSwallowed)(() => db.assistantProviderExecution.update({
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
        }), { P2025: () => (0, logger_1.logEvent)('warn', { event: 'assistant.conversation_race_skip', stage: 'providerAudit.finalize', executionId: id, turnId: input.turnId }) });
    }
    return { begin, finalize };
}
//# sourceMappingURL=provider-audit.service.js.map