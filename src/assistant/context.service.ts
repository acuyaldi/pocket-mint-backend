import type { PrismaClient } from '../generated/prisma/client';
import { AssistantError } from './errors';
import { assertAssistantMessageLength, normalizeProvidedMessage } from './persistence';
import { assembleAssistantContext, DEFAULT_ASSISTANT_CONTEXT_LIMITS } from './context.assembler';
import type { AssistantContext, AssistantContextLimits, ContextMessageRow } from './context.types';

export interface BuildAssistantExecutionContextInput {
  userId: string;
  conversationId: string;
  currentRequest: string;
}

export function createAssistantContextService(
  db: PrismaClient,
  clock: () => Date = () => new Date(),
  limits: AssistantContextLimits = DEFAULT_ASSISTANT_CONTEXT_LIMITS,
) {
  async function buildExecutionContext(input: BuildAssistantExecutionContextInput): Promise<AssistantContext> {
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
    if (!conversation) throw AssistantError.conversationNotFound();
    if (conversation.status !== 'ACTIVE') throw AssistantError.conversationNotContinuable();

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

    return assembleAssistantContext({
      conversation,
      messages: boundedMessages as ContextMessageRow[],
      pendingDraft,
      toolExecutions,
      currentRequest,
    }, limits);
  }

  return { buildExecutionContext };
}

export type AssistantContextService = ReturnType<typeof createAssistantContextService>;
