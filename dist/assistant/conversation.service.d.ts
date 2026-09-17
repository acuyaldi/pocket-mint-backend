import type { PrismaClient, Prisma } from '../generated/prisma/client';
import type { BeginTurnInput, BeginTurnResult, ConversationMessageDto, ConversationSummaryDto, FinalizeToolInput, FinalizeWithoutToolInput, Page } from './conversation.types';
/** Outcome of claiming a request-level Idempotency-Key for /assistant/messages or /assistant/execute. */
export type IdempotencyClaim = {
    outcome: 'new';
} | {
    outcome: 'in_progress';
} | {
    outcome: 'replay';
    httpStatus: number;
    response: unknown;
};
export declare function createAssistantConversationService(db: PrismaClient): {
    assertContinuable: (userId: string, id: string) => Promise<void>;
    assertOwned: (userId: string, id: string) => Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import("@/generated/prisma").$Enums.AssistantConversationStatus;
        locale: string;
        lastActivityAt: Date;
        archivedAt: Date | null;
    }>;
    establishConversation: (userId: string, conversationId: string | undefined, locale: string) => Promise<string>;
    beginTurn: (input: BeginTurnInput) => Promise<BeginTurnResult>;
    markTurnRunning: (turnId: string) => Promise<void>;
    beginToolExecution: (input: {
        conversationId: string;
        turnId: string;
        correlationId: string;
        toolId: string;
        capability: string;
        riskLevel: string;
        policyDecision: string;
        redactedInput?: Prisma.InputJsonValue;
    }) => Promise<string>;
    finalize: (input: FinalizeToolInput, options?: {
        transaction?: Prisma.TransactionClient;
    }) => Promise<void>;
    finalizeRejected: (input: BeginTurnResult & {
        content: string;
        safeErrorCode: string;
    }) => Promise<void>;
    finalizeWithoutTool: (input: FinalizeWithoutToolInput, options?: {
        transaction?: Prisma.TransactionClient;
    }) => Promise<void>;
    listOwnedConversations: (userId: string, page?: number, limit?: number) => Promise<Page<ConversationSummaryDto>>;
    getOwnedConversation: (userId: string, id: string, page?: number, limit?: number) => Promise<{
        conversation: {
            id: string;
            status: import("@/generated/prisma").$Enums.AssistantConversationStatus;
            locale: string;
            createdAt: Date;
            updatedAt: Date;
            lastActivityAt: Date;
            sourceChannels: import("@/generated/prisma").$Enums.AssistantChannel[];
        };
        messages: {
            items: ConversationMessageDto[];
            page: number;
            limit: number;
            total: number;
            hasMore: boolean;
        };
        turns: {
            id: string;
            status: import("@/generated/prisma").$Enums.AssistantTurnStatus;
            correlationId: string;
            startedAt: Date;
            safeErrorCode: string | null;
            intent: string;
            finishedAt: Date | null;
            channel: import("@/generated/prisma").$Enums.AssistantChannel;
            toolExecutions: {
                durationMs: number | null;
                id: string;
                status: import("@/generated/prisma").$Enums.AssistantToolExecutionStatus;
                correlationId: string;
                startedAt: Date;
                completedAt: Date | null;
                safeErrorCode: string | null;
                toolId: string;
                capability: string;
                riskLevel: string;
                policyDecision: string;
            }[];
        }[];
    }>;
    archiveOwnedConversation: (userId: string, id: string) => Promise<{
        id: string;
        status: import("@/generated/prisma").$Enums.AssistantConversationStatus;
        archivedAt: Date | null;
    }>;
    restoreOwnedConversation: (userId: string, id: string) => Promise<{
        id: string;
        status: import("@/generated/prisma").$Enums.AssistantConversationStatus;
        archivedAt: Date | null;
    }>;
    deleteOwnedConversation: (userId: string, id: string) => Promise<{
        id: string;
    }>;
    claimIdempotencyKey: (userId: string, keyValue: string, operation: string) => Promise<IdempotencyClaim>;
    resolveIdempotencyKey: (userId: string, keyValue: string, result: {
        httpStatus: number;
        response: unknown;
        turnId?: string;
    }) => Promise<void>;
    releaseIdempotencyKey: (userId: string, keyValue: string) => Promise<void>;
};
export type AssistantConversationService = ReturnType<typeof createAssistantConversationService>;
