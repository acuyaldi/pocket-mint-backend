"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssistantContextService = createAssistantContextService;
const client_1 = require("../generated/prisma/client");
const errors_1 = require("./errors");
const persistence_1 = require("./persistence");
const context_assembler_1 = require("./context.assembler");
function createAssistantContextService(db, clock = () => new Date(), limits = context_assembler_1.DEFAULT_ASSISTANT_CONTEXT_LIMITS) {
    (0, context_assembler_1.validateAssistantContextLimits)(limits);
    async function buildExecutionContextUnsafe(input) {
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
            },
        });
        if (!conversation)
            throw errors_1.AssistantError.conversationNotFound();
        if (conversation.status !== 'ACTIVE')
            throw errors_1.AssistantError.conversationNotContinuable();
        const [messages, pendingDraft, toolExecutions] = await Promise.all([
            db.$queryRaw(client_1.Prisma.sql `
        WITH recent AS (
          SELECT m.id, m.turn_id AS "turnId", m.role, m.source, m.content, m.created_at AS "createdAt",
                 t.status AS "turnStatus", t.created_at AS "turnCreatedAt"
          FROM assistant_messages m
          INNER JOIN assistant_turns t ON t.id = m.turn_id AND t.conversation_id = m.conversation_id
          INNER JOIN assistant_conversations c ON c.id = m.conversation_id
          WHERE m.conversation_id = ${conversation.id}
            AND c.user_id = ${input.userId}
            AND m.role IN ('USER'::"AssistantMessageRole", 'ASSISTANT'::"AssistantMessageRole")
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT ${limits.messages}
        ), latest_assistant AS (
          SELECT m.id, m.turn_id AS "turnId", m.role, m.source, m.content, m.created_at AS "createdAt",
                 t.status AS "turnStatus", t.created_at AS "turnCreatedAt"
          FROM assistant_messages m
          INNER JOIN assistant_turns t ON t.id = m.turn_id AND t.conversation_id = m.conversation_id
          INNER JOIN assistant_conversations c ON c.id = m.conversation_id
          WHERE m.conversation_id = ${conversation.id}
            AND c.user_id = ${input.userId}
            AND m.role = 'ASSISTANT'::"AssistantMessageRole"
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT 1
        )
        SELECT * FROM recent
        UNION
        SELECT * FROM latest_assistant
      `),
            db.assistantFinancialDraft.findFirst({
                where: {
                    conversationId: conversation.id,
                    userId: input.userId,
                    conversation: { userId: input.userId },
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
                where: { conversationId: conversation.id, conversation: { userId: input.userId } },
                orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
                take: limits.toolExecutions,
                select: { id: true, toolId: true, status: true, startedAt: true, outputSummary: true },
            }),
        ]);
        const boundedMessages = messages.map((message) => ({
            id: message.id,
            turnId: message.turnId,
            role: message.role,
            source: message.source,
            content: message.content,
            createdAt: message.createdAt,
            turn: { status: message.turnStatus, createdAt: message.turnCreatedAt },
        }));
        return (0, context_assembler_1.assembleAssistantContext)({
            conversation,
            messages: boundedMessages,
            pendingDraft,
            toolExecutions,
            currentRequest,
        }, limits);
    }
    async function buildExecutionContext(input) {
        try {
            return await buildExecutionContextUnsafe(input);
        }
        catch (error) {
            if (error instanceof errors_1.AssistantError)
                throw error;
            throw errors_1.AssistantError.contextPreparationFailed();
        }
    }
    return { buildExecutionContext };
}
//# sourceMappingURL=context.service.js.map