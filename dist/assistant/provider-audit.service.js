"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssistantProviderAuditService = createAssistantProviderAuditService;
function createAssistantProviderAuditService(db) {
    async function begin(input) {
        const row = await db.assistantProviderExecution.create({
            data: input,
            select: { id: true },
        });
        return row.id;
    }
    async function finalize(id, input) {
        await db.assistantProviderExecution.update({
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
    }
    return { begin, finalize };
}
//# sourceMappingURL=provider-audit.service.js.map