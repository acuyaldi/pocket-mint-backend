import { Prisma, type PrismaClient } from '../generated/prisma/client';
import { AssistantError } from './errors';
import { assertAssistantMessageLength, normalizeProvidedMessage } from './persistence';
import { assembleAssistantContext, DEFAULT_ASSISTANT_CONTEXT_LIMITS, validateAssistantContextLimits } from './context.assembler';
import type { AssistantContext, AssistantContextLimits, ContextMessageRow } from './context.types';

export interface BuildAssistantExecutionContextInput {
  readonly userId: string;
  readonly conversationId: string;
  /** Unpersisted request for the in-progress provider turn; appended exactly once. */
  readonly currentRequest: string;
}

export function createAssistantContextService(
  db: PrismaClient,
  clock: () => Date = () => new Date(),
  limits: AssistantContextLimits = DEFAULT_ASSISTANT_CONTEXT_LIMITS,
) {
  validateAssistantContextLimits(limits);

  async function buildExecutionContextUnsafe(input: BuildAssistantExecutionContextInput): Promise<AssistantContext> {
    const currentRequest = normalizeProvidedMessage(input.currentRequest);
    if (!currentRequest) throw AssistantError.invalidRequest('current user request is required');
    assertAssistantMessageLength(currentRequest);

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
    if (!conversation) throw AssistantError.conversationNotFound();
    if (conversation.status !== 'ACTIVE') throw AssistantError.conversationNotContinuable();

    const [messages, pendingDraft, toolExecutions] = await Promise.all([
      db.$queryRaw<Array<Omit<ContextMessageRow, 'turn'> & { turnStatus: string; turnCreatedAt: Date }>>(Prisma.sql`
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

    const boundedMessages: ContextMessageRow[] = messages.map((message) => ({
      id: message.id,
      turnId: message.turnId,
      role: message.role,
      source: message.source,
      content: message.content,
      createdAt: message.createdAt,
      turn: { status: message.turnStatus, createdAt: message.turnCreatedAt },
    }));

    return assembleAssistantContext({
      conversation,
      messages: boundedMessages,
      pendingDraft,
      toolExecutions,
      currentRequest,
    }, limits);
  }

  async function buildExecutionContext(input: BuildAssistantExecutionContextInput): Promise<AssistantContext> {
    try {
      return await buildExecutionContextUnsafe(input);
    } catch (error) {
      if (error instanceof AssistantError) throw error;
      throw AssistantError.contextPreparationFailed();
    }
  }

  return { buildExecutionContext };
}

export type AssistantContextService = ReturnType<typeof createAssistantContextService>;
