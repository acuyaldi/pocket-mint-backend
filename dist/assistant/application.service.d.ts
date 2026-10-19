import { type HandlerRegistry } from './executor';
import type { ToolRegistry } from './registry';
import type { AssistantCanonicalRequest, AssistantCanonicalResponse } from './types';
import type { AssistantConversationService } from './conversation.service';
import type { AssistantFinancialDraftService } from './financial-draft.service';
import type { AssistantContextService, BuildAssistantExecutionContextInput } from './context.service';
import { type EntityResolutionService } from './entity-resolution';
import type { ClarificationService } from './clarification.service';
import type { AssistantCaptureField, Prisma } from '../generated/prisma/client';
import { type CaptureEventEmitter } from './capture-events';
import type { CategorySuggestion } from '../domain/categorization';
type TxClient = Prisma.TransactionClient;
export interface AssistantApplicationResult {
    response: AssistantCanonicalResponse;
    httpStatus: number;
    /** Present only when the caller supplied an Idempotency-Key (Phase 27). Log-only — never sent to the client. */
    idempotencyOutcome?: 'new' | 'replay';
    /** Which field a clarification asks about (Phase 35.1 capture events). Never sent to the client. */
    captureField?: AssistantCaptureField;
}
export declare function createAssistantApplicationService(deps: {
    conversations: AssistantConversationService;
    contexts?: AssistantContextService;
    toolRegistry: ToolRegistry;
    handlerRegistry: HandlerRegistry;
    financialDrafts?: AssistantFinancialDraftService;
    entityResolution?: EntityResolutionService;
    clarification?: ClarificationService;
    /** Deterministic keyword/merchant-mapping category suggestion (owner-scoped). */
    categorization?: {
        getSuggestions(userId: string, description: string, type: 'INCOME' | 'EXPENSE', options?: {
            transaction?: TxClient;
        }): Promise<readonly CategorySuggestion[]>;
    };
    captureEvents?: CaptureEventEmitter;
}): {
    execute: (userId: string, correlationId: string, request: AssistantCanonicalRequest, idempotencyKey?: string) => Promise<AssistantApplicationResult>;
    prepareProviderExecution: (input: BuildAssistantExecutionContextInput) => Promise<import("./context.types").AssistantContext>;
    selectClarification: (userId: string, correlationId: string, token: string, conversationId: string, clarificationId?: string | undefined) => Promise<AssistantApplicationResult>;
    submitGuidedClarification: (userId: string, correlationId: string, fields: Record<string, unknown>, conversationId: string, clarificationId: string) => Promise<AssistantApplicationResult>;
    cancelClarification: (userId: string, correlationId: string, clarificationId: string, conversationId: string) => Promise<AssistantApplicationResult>;
    getAssistantState: (userId: string, conversationId: string) => Promise<import("./clarification.types").AssistantStateProjection>;
    inferCategoryId: (userId: string, type: "INCOME" | "EXPENSE", hint: string | undefined, transaction?: TxClient) => Promise<string | undefined>;
};
export type AssistantApplicationService = ReturnType<typeof createAssistantApplicationService>;
export {};
