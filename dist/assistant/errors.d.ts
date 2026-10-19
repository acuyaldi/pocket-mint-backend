export declare class AssistantError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational = true;
    /** Optional bounded, non-sensitive detail (e.g. a draft status) for observability categorization — never user content. */
    readonly detail?: string;
    private constructor();
    static toolNotFound(toolId: string): AssistantError;
    static toolDisabled(toolId: string): AssistantError;
    static invalidInput(toolId: string, detail: string): AssistantError;
    static invalidOutput(toolId: string, detail: string): AssistantError;
    static duplicateRegistration(toolId: string): AssistantError;
    static policyDenied(toolId: string, reason: string): AssistantError;
    static executionTimeout(toolId: string, timeoutMs: number): AssistantError;
    static invalidTimeout(toolId: string, timeoutMs: number): AssistantError;
    static policyMismatch(toolId: string, detail: string): AssistantError;
    static unsupportedIntent(intent: string): AssistantError;
    static invalidRequest(detail: string): AssistantError;
    static conversationNotFound(): AssistantError;
    static conversationNotContinuable(): AssistantError;
    /** Draft confirm/cancel on a non-ACTIVE conversation (Phase 38.1). Same code as above, so existing clients keep working; `detail` tells it apart. The draft itself is untouched. */
    static conversationArchived(): AssistantError;
    static invalidContextConfiguration(): AssistantError;
    static contextTooLarge(): AssistantError;
    static unsupportedContextData(): AssistantError;
    static contextPreparationFailed(): AssistantError;
    static invalidIdempotencyKey(): AssistantError;
    static draftNotFound(): AssistantError;
    static draftConflict(status: string): AssistantError;
    /** Prisma P2028 on draft confirm: rolled back, nothing saved, draft untouched — retry with the same Idempotency-Key. */
    static transactionTimeout(): AssistantError;
    static idempotencyConflict(): AssistantError;
    static requestInProgress(): AssistantError;
    static clarificationNotFound(): AssistantError;
    static clarificationInvalidOption(): AssistantError;
    static clarificationAlreadyConsumed(): AssistantError;
    static clarificationCancelled(): AssistantError;
    static clarificationStale(): AssistantError;
    static clarificationExpired(): AssistantError;
    static clarificationContinuationInvalid(): AssistantError;
    static clarificationContextInvalid(): AssistantError;
}
