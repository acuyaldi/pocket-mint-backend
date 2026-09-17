/** Terminal-execution categories PD-015/PD-016 mark as needing manual inspection. */
export declare const AMBIGUOUS_ERROR_CATEGORIES: readonly ["ambiguous_assistant_execution", "ambiguous_callback_execution"];
export declare const STALE_RUNNING_TURN_MS: number;
export declare function isAmbiguousExecution(row: {
    errorCategory: string | null;
}): boolean;
export interface SafeInboundJobRow {
    id: string;
    provider: string;
    status: string;
    attempt: number;
    errorCategory: string | null;
    assistantTurnId: string | null;
    createdAt: Date;
    completedAt: Date | null;
}
export declare function toSafeInboundJobRow(row: {
    id: string;
    provider: string;
    status: string;
    attempt: number;
    errorCategory: string | null;
    assistantTurnId: string | null;
    createdAt: Date;
    completedAt: Date | null;
}): SafeInboundJobRow;
export interface SafeOutboundDeliveryRow {
    id: string;
    inboundJobId: string;
    provider: string;
    status: string;
    attempt: number;
    errorCategory: string | null;
    createdAt: Date;
    sentAt: Date | null;
}
export declare function toSafeOutboundDeliveryRow(row: {
    id: string;
    inboundJobId: string;
    provider: string;
    status: string;
    attempt: number;
    errorCategory: string | null;
    createdAt: Date;
    sentAt: Date | null;
}): SafeOutboundDeliveryRow;
export interface SafeAssistantTurnRow {
    id: string;
    conversationId: string;
    correlationId: string;
    intent: string;
    status: string;
    startedAt: Date;
}
export declare function toSafeAssistantTurnRow(row: {
    id: string;
    conversationId: string;
    correlationId: string;
    intent: string;
    status: string;
    startedAt: Date;
}): SafeAssistantTurnRow;
/** Groups rows by `errorCategory` (nulls bucketed as `'(none)'`), counted only. */
export declare function summarizeByErrorCategory(rows: Array<{
    errorCategory: string | null;
}>): Record<string, number>;
