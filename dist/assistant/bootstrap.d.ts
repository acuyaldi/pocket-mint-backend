import { ToolRegistry } from './registry';
import type { HandlerRegistry } from './executor';
/** The application-wide tool registry. Populated at startup. */
export declare const toolRegistry: ToolRegistry;
/** The application-wide handler registry. Populated at startup. */
export declare const handlerRegistry: HandlerRegistry;
export declare const assistantConversationService: {
    assertContinuable: (userId: string, id: string) => Promise<void>;
    beginTurn: (input: import("./conversation.types").BeginTurnInput) => Promise<import("./conversation.types").BeginTurnResult>;
    markTurnRunning: (turnId: string) => Promise<void>;
    beginToolExecution: (input: {
        conversationId: string;
        turnId: string;
        correlationId: string;
        toolId: string;
        capability: string;
        riskLevel: string;
        policyDecision: string;
        redactedInput?: import("@/generated/prisma/runtime/client").InputJsonValue;
    }) => Promise<string>;
    finalize: (input: import("./conversation.types").FinalizeToolInput) => Promise<void>;
    finalizeRejected: (input: import("./conversation.types").BeginTurnResult & {
        content: string;
        safeErrorCode: string;
    }) => Promise<void>;
    recoverFailedFinalization: (turnId: string, executionId: string) => Promise<void>;
    listOwnedConversations: (userId: string, page?: number, limit?: number) => Promise<import("./conversation.types").Page<import("./conversation.types").ConversationSummaryDto>>;
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
            items: import("./conversation.types").ConversationMessageDto[];
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
export declare const assistantApplicationService: {
    execute: (userId: string, correlationId: string, request: import("./types").AssistantCanonicalRequest) => Promise<import("./application.service").AssistantApplicationResult>;
};
//# sourceMappingURL=bootstrap.d.ts.map