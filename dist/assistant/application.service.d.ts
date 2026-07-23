import { type HandlerRegistry } from './executor';
import type { ToolRegistry } from './registry';
import type { AssistantCanonicalRequest, AssistantCanonicalResponse } from './types';
import type { AssistantConversationService } from './conversation.service';
import type { AssistantFinancialDraftService } from './financial-draft.service';
import type { AssistantContextService, BuildAssistantExecutionContextInput } from './context.service';
export interface AssistantApplicationResult {
    response: AssistantCanonicalResponse;
    httpStatus: number;
}
export declare function createAssistantApplicationService(deps: {
    conversations: AssistantConversationService;
    contexts?: AssistantContextService;
    toolRegistry: ToolRegistry;
    handlerRegistry: HandlerRegistry;
    financialDrafts?: AssistantFinancialDraftService;
}): {
    execute: (userId: string, correlationId: string, request: AssistantCanonicalRequest) => Promise<AssistantApplicationResult>;
    prepareProviderExecution: (input: BuildAssistantExecutionContextInput) => Promise<import("./context.types").AssistantContext>;
};
export type AssistantApplicationService = ReturnType<typeof createAssistantApplicationService>;
//# sourceMappingURL=application.service.d.ts.map