export interface AssistantContextLimits {
    messages: number;
    turns: number;
    toolExecutions: number;
    pendingDrafts: number;
    maxSerializedBytes: number;
}
export interface MessageContext {
    role: 'USER' | 'ASSISTANT';
    content: string;
    source: string;
    timestamp?: string;
}
export interface TurnContext {
    status: string;
    timestamp: string;
    messages: MessageContext[];
}
export interface ConversationContext {
    conversationId: string;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
}
export interface DraftContext {
    draftId: string;
    operation: string;
    status: string;
    preview: {
        type: string;
        amount: string;
        date: string;
        description?: string;
    };
    expiresAt: string;
    confirmationRequired: true;
}
export interface ToolExecutionContext {
    tool: string;
    status: string;
    timestamp: string;
    safeOutputSummary?: unknown;
}
export interface AssistantContext {
    system: {
        contextVersion: '1';
        locale: string;
    };
    conversation: ConversationContext;
    turns: TurnContext[];
    pendingDraft?: DraftContext;
    toolExecutions: ToolExecutionContext[];
    currentRequest: MessageContext & {
        role: 'USER';
        source: 'CURRENT_REQUEST';
        timestamp?: never;
    };
}
export interface ContextConversationRow {
    id: string;
    status: string;
    locale: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ContextMessageRow {
    id: string;
    turnId: string;
    role: 'USER' | 'ASSISTANT';
    source: string;
    content: string;
    createdAt: Date;
    turn: {
        status: string;
        createdAt: Date;
    };
}
export interface ContextDraftRow {
    id: string;
    status: string;
    operation: string;
    transactionType: string;
    amount: {
        toString(): string;
    };
    transactionDate: Date;
    description: string | null;
    expiresAt: Date;
}
export interface ContextToolExecutionRow {
    id: string;
    toolId: string;
    status: string;
    startedAt: Date;
    outputSummary: unknown;
}
export interface AssistantContextAssemblyInput {
    conversation: ContextConversationRow;
    messages: ContextMessageRow[];
    pendingDraft: ContextDraftRow | null;
    toolExecutions: ContextToolExecutionRow[];
    currentRequest: string;
}
//# sourceMappingURL=context.types.d.ts.map