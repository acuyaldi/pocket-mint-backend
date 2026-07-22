import type { PrismaClient, Prisma } from '../generated/prisma/client';
import type { BeginTurnInput, BeginTurnResult, ConversationMessageDto, ConversationSummaryDto, FinalizeToolInput, Page } from './conversation.types';
export declare function createAssistantConversationService(db: PrismaClient): {
    assertContinuable: (userId: string, id: string) => Promise<void>;
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
    finalize: (input: FinalizeToolInput) => Promise<void>;
    finalizeRejected: (input: BeginTurnResult & {
        content: string;
        safeErrorCode: string;
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
            intent: string;
            safeErrorCode: string | null;
            startedAt: Date;
            finishedAt: Date | null;
            toolExecutions: {
                id: string;
                status: import("@/generated/prisma").$Enums.AssistantToolExecutionStatus;
                correlationId: string;
                safeErrorCode: string | null;
                startedAt: Date;
                toolId: string;
                capability: string;
                riskLevel: string;
                policyDecision: string;
                completedAt: Date | null;
                durationMs: number | null;
            }[];
        }[];
    }>;
    archiveOwnedConversation: (userId: string, id: string) => Promise<{
        id: string;
        status: import("@/generated/prisma").$Enums.AssistantConversationStatus;
        archivedAt: Date | null;
    }>;
};
export type AssistantConversationService = ReturnType<typeof createAssistantConversationService>;
//# sourceMappingURL=conversation.service.d.ts.map