// ============================================================
// Assistant Core — public API surface
// ------------------------------------------------------------
// Everything downstream of the provider adapter imports from here.
// All types are provider-neutral; no LLM SDK, Prisma, or Express
// types leak through this barrel.
// ============================================================

export { AssistantError } from './errors';
export { evaluatePolicy } from './policy';
export { ToolRegistry } from './registry';
export { monthlySpendingSummary, transactionCreate } from './tools';
export type { TransactionCreateInput } from './tools';
export { executeTool } from './executor';
export { resolveIntent } from './intent';
export { renderMonthlySpendingSummary } from './renderer';
export { toolRegistry, handlerRegistry } from './bootstrap';
export { createAssistantConversationService } from './conversation.service';
export { createAssistantApplicationService } from './application.service';
export * from './persistence';

export type {
  ToolId,
  Capability,
  RiskLevel,
  ConfirmationPolicy,
  IdempotencyPolicy,
  ToolExecutionStatus,
  ToolContract,
  ExecutionContext,
  PolicyResult,
  AssistantCanonicalRequest,
  AssistantCanonicalResponse,
  AssistantSuccessResponse,
  AssistantClarificationResponse,
  AssistantRejectedResponse,
  AssistantErrorResponse,
  ToolExecutionResult,
} from './types';

export type { ToolHandler, HandlerRegistry } from './executor';
export type { AssistantConversationService } from './conversation.service';
export type {
  AssistantContext,
  AssistantContextLimits,
  ConversationContext,
  DraftContext,
  MessageContext,
  ToolExecutionContext,
  TurnContext,
} from './context.types';
export type * from './conversation.types';
