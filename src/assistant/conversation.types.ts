import type { AssistantChannel, AssistantMessageRole, AssistantMessageSource, AssistantToolExecutionStatus, AssistantTurnStatus, Prisma } from '../generated/prisma/client';

export interface BeginTurnInput {
  userId: string;
  conversationId?: string;
  correlationId: string;
  intent: string;
  locale: string;
  content: string;
  source: AssistantMessageSource;
}

export interface BeginTurnResult { conversationId: string; turnId: string }

export interface ConversationSummaryDto {
  id: string;
  status: string;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  /** First USER-authored message — the original request that started the conversation. Used as the display title. */
  title?: string;
  lastMessage?: string;
  /**
   * Distinct channels that produced at least one turn in this conversation
   * (Phase 30). Never carries provider identifiers — only the safe
   * `AssistantChannel` label. Empty for a conversation with no turns yet.
   */
  sourceChannels: AssistantChannel[];
}

export interface ConversationMessageDto {
  id: string;
  turnId: string;
  role: AssistantMessageRole;
  source: AssistantMessageSource;
  content: string;
  createdAt: Date;
}

export interface Page<T> { items: T[]; page: number; limit: number; total: number; hasMore: boolean }

export interface FinalizeToolInput {
  executionId: string;
  turnId: string;
  conversationId: string;
  status: AssistantToolExecutionStatus;
  turnStatus: AssistantTurnStatus;
  assistantContent: string;
  assistantSource: AssistantMessageSource;
  durationMs?: number;
  safeErrorCode?: string;
  outputSummary?: Prisma.InputJsonValue;
}

export interface FinalizeWithoutToolInput extends BeginTurnResult {
  turnStatus: AssistantTurnStatus;
  assistantContent: string;
  assistantSource: AssistantMessageSource;
  safeErrorCode?: string;
}
