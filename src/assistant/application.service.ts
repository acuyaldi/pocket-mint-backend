import { AssistantError } from './errors';
import { executeTool, type HandlerRegistry } from './executor';
import { resolveIntent } from './intent';
import { renderMonthlySpendingSummary } from './renderer';
import type { ToolRegistry } from './registry';
import type { AssistantCanonicalRequest, AssistantCanonicalResponse } from './types';
import type { AssistantConversationService } from './conversation.service';
import { assertAssistantMessageLength, monthlySummaryFallback, monthlySummaryInputForAudit, monthlySummaryOutputForAudit, normalizeProvidedMessage, safeRejectedAssistantMessage, safeRejectedUserMessage, SAFE_REJECTED_INTENT } from './persistence';
import { evaluatePolicy } from './policy';
import { logger } from '../utils/logger';

export interface AssistantApplicationResult { response: AssistantCanonicalResponse; httpStatus: number }

export function createAssistantApplicationService(deps: { conversations: AssistantConversationService; toolRegistry: ToolRegistry; handlerRegistry: HandlerRegistry }) {
  async function execute(userId: string, correlationId: string, request: AssistantCanonicalRequest): Promise<AssistantApplicationResult> {
    const locale = request.locale?.trim() || 'id-ID';
    if (request.conversationId) await deps.conversations.assertContinuable(userId, request.conversationId);
    const provided = normalizeProvidedMessage(request.message);
    let resolved: ReturnType<typeof resolveIntent>;
    let validatedInput: { month: string };
    try {
      resolved = resolveIntent(request);
      const contract = deps.toolRegistry.get(resolved.toolId);
      if (!contract) throw AssistantError.toolNotFound(resolved.toolId);
      validatedInput = contract.validateInput(resolved.arguments) as { month: string };
    } catch (error) {
      const operational = error instanceof AssistantError ? error : AssistantError.invalidRequest('request cannot be validated');
      const safeMessage = safeRejectedAssistantMessage(operational.code);
      const turn = await deps.conversations.beginTurn({ userId, conversationId: request.conversationId, correlationId, intent: SAFE_REJECTED_INTENT, locale, content: safeRejectedUserMessage(), source: 'SAFE_REQUEST_SUMMARY' });
      await deps.conversations.finalizeRejected({ ...turn, content: safeMessage, safeErrorCode: operational.code });
      return { httpStatus: operational.statusCode, response: { status: 'rejected', code: operational.code, message: safeMessage, correlationId, ...turn } };
    }
    const turn = await deps.conversations.beginTurn({ userId, conversationId: request.conversationId, correlationId, intent: request.intent, locale, content: provided ?? monthlySummaryFallback(validatedInput), source: provided ? 'USER_PROVIDED' : 'CANONICAL_FALLBACK' });
    await deps.conversations.markTurnRunning(turn.turnId);
    const contract = deps.toolRegistry.get(resolved.toolId)!;
    const policy = evaluatePolicy(contract);
    const executionId = await deps.conversations.beginToolExecution({ ...turn, correlationId, toolId: contract.id, capability: contract.capability, riskLevel: contract.riskLevel, policyDecision: policy.action, redactedInput: monthlySummaryInputForAudit(validatedInput) });
    const startedAt = Date.now();
    let result: Awaited<ReturnType<typeof executeTool>>;
    try {
      result = await executeTool(resolved.toolId, validatedInput, { userId, correlationId, ...turn, timestamp: new Date() }, deps.toolRegistry, deps.handlerRegistry);
    } catch (error) {
      const operational = error instanceof AssistantError ? error : { message: 'Assistant execution failed', statusCode: 500, code: 'ASSISTANT_EXECUTION_FAILED' };
      const status = operational.code === 'ASSISTANT_EXECUTION_TIMEOUT' ? 'TIMED_OUT'
        : operational.code === 'ASSISTANT_POLICY_DENIED' || operational.code === 'ASSISTANT_TOOL_DISABLED' ? 'DENIED'
        : 'FAILED';
      await deps.conversations.finalize({ executionId, ...turn, status, turnStatus: 'FAILED', assistantContent: operational.message, assistantSource: 'SAFE_ERROR', durationMs: Date.now() - startedAt, safeErrorCode: operational.code }).catch(() => undefined);
      return { httpStatus: operational.statusCode, response: { status: 'error', code: operational.code, message: operational.message, correlationId, ...turn } };
    }
    const renderedText = assertAssistantMessageLength(renderMonthlySpendingSummary(result.output as never));
    try {
      await deps.conversations.finalize({ executionId, ...turn, status: 'SUCCEEDED', turnStatus: 'SUCCEEDED', assistantContent: renderedText, assistantSource: 'DETERMINISTIC_RENDERER', durationMs: result.durationMs, outputSummary: monthlySummaryOutputForAudit(result.output as never) });
    } catch (error) {
      logger.error('assistant_finalization_failed', { correlationId, conversationId: turn.conversationId, turnId: turn.turnId });
      throw error;
    }
    return { httpStatus: 200, response: { status: 'success', renderedText, data: result.output, correlationId, ...turn } };
  }
  return { execute };
}

export type AssistantApplicationService = ReturnType<typeof createAssistantApplicationService>;
