"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssistantContextService = createAssistantContextService;
const errors_1 = require("./errors");
const persistence_1 = require("./persistence");
const context_assembler_1 = require("./context.assembler");
function createAssistantContextService(db, clock = () => new Date(), limits = context_assembler_1.DEFAULT_ASSISTANT_CONTEXT_LIMITS) {
    async function buildExecutionContext(input) {
        const currentRequest = (0, persistence_1.normalizeProvidedMessage)(input.currentRequest);
        if (!currentRequest)
            throw errors_1.AssistantError.invalidRequest('current user request is required');
        (0, persistence_1.assertAssistantMessageLength)(currentRequest);
        const conversation = await db.assistantConversation.findFirst({
            where: { id: input.conversationId, userId: input.userId },
            select: {
                id: true,
                status: true,
                locale: true,
                createdAt: true,
                updatedAt: true,
                messages: {
                    where: { role: 'ASSISTANT' },
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    take: 1,
                    select: {
                        id: true,
                        turnId: true,
                        role: true,
                        source: true,
                        content: true,
                        createdAt: true,
                        turn: { select: { status: true, createdAt: true } },
                    },
                },
            },
        });
        if (!conversation)
            throw errors_1.AssistantError.conversationNotFound();
        if (conversation.status !== 'ACTIVE')
            throw errors_1.AssistantError.conversationNotContinuable();
        const [messages, pendingDraft, toolExecutions] = await Promise.all([
            db.assistantMessage.findMany({
                where: { conversationId: conversation.id, role: { in: ['USER', 'ASSISTANT'] } },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: limits.messages,
                select: {
                    id: true,
                    turnId: true,
                    role: true,
                    source: true,
                    content: true,
                    createdAt: true,
                    turn: { select: { status: true, createdAt: true } },
                },
            }),
            db.assistantFinancialDraft.findFirst({
                where: {
                    conversationId: conversation.id,
                    userId: input.userId,
                    status: 'PENDING_CONFIRMATION',
                    expiresAt: { gt: clock() },
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                select: {
                    id: true,
                    status: true,
                    operation: true,
                    transactionType: true,
                    amount: true,
                    transactionDate: true,
                    description: true,
                    expiresAt: true,
                },
            }),
            db.assistantToolExecution.findMany({
                where: { conversationId: conversation.id },
                orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
                take: limits.toolExecutions,
                select: { id: true, toolId: true, status: true, startedAt: true, outputSummary: true },
            }),
        ]);
        const latestAssistant = conversation.messages[0];
        const boundedMessages = latestAssistant && !messages.some((message) => message.id === latestAssistant.id)
            ? [...messages, latestAssistant]
            : messages;
        return (0, context_assembler_1.assembleAssistantContext)({
            conversation,
            messages: boundedMessages,
            pendingDraft,
            toolExecutions,
            currentRequest,
        }, limits);
    }
    return { buildExecutionContext };
}
//# sourceMappingURL=context.service.js.map