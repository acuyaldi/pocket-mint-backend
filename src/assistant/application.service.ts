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
import type { TransactionCreateInput } from './tools';
import type { AssistantFinancialDraftService } from './financial-draft.service';

export interface AssistantApplicationResult { response: AssistantCanonicalResponse; httpStatus: number }

export function createAssistantApplicationService(deps: { conversations: AssistantConversationService; toolRegistry: ToolRegistry; handlerRegistry: HandlerRegistry; financialDrafts?: AssistantFinancialDraftService }) {
  async function execute(userId: string, correlationId: string, request: AssistantCanonicalRequest): Promise<AssistantApplicationResult> {
    const locale = request.locale?.trim() || 'id-ID';
    if (request.conversationId) await deps.conversations.assertContinuable(userId, request.conversationId);
    const provided = normalizeProvidedMessage(request.message);
    let resolved: ReturnType<typeof resolveIntent>;
    let validatedInput: { month: string } | TransactionCreateInput;
    try {
      resolved = resolveIntent(request);
      const contract = deps.toolRegistry.get(resolved.toolId);
      if (!contract) throw AssistantError.toolNotFound(resolved.toolId);
      validatedInput = contract.validateInput(resolved.arguments) as { month: string } | TransactionCreateInput;
    } catch (error) {
      const operational = error instanceof AssistantError ? error : AssistantError.invalidRequest('request cannot be validated');
      const safeMessage = safeRejectedAssistantMessage(operational.code);
      const turn = await deps.conversations.beginTurn({ userId, conversationId: request.conversationId, correlationId, intent: SAFE_REJECTED_INTENT, locale, content: safeRejectedUserMessage(), source: 'SAFE_REQUEST_SUMMARY' });
      await deps.conversations.finalizeRejected({ ...turn, content: safeMessage, safeErrorCode: operational.code });
      return { httpStatus: operational.statusCode, response: { status: 'rejected', code: operational.code, message: safeMessage, correlationId, ...turn } };
    }
    const fallback = request.intent === 'transaction.create' ? 'Siapkan draft transaksi untuk konfirmasi.' : monthlySummaryFallback(validatedInput as { month: string });
    const turn = await deps.conversations.beginTurn({ userId, conversationId: request.conversationId, correlationId, intent: request.intent, locale, content: provided ?? fallback, source: provided ? 'USER_PROVIDED' : 'CANONICAL_FALLBACK' });
    await deps.conversations.markTurnRunning(turn.turnId);
    const contract = deps.toolRegistry.get(resolved.toolId)!;
    const policy = evaluatePolicy(contract);
    const redactedInput = request.intent === 'transaction.create' ? { operation: 'transaction.create' } : monthlySummaryInputForAudit(validatedInput as { month: string });
    const executionId = await deps.conversations.beginToolExecution({ ...turn, correlationId, toolId: contract.id, capability: contract.capability, riskLevel: contract.riskLevel, policyDecision: policy.action, redactedInput });
    const startedAt = Date.now();
    if (policy.action === 'DRAFT_AND_CONFIRM') {
      if (!deps.financialDrafts) throw new Error('Financial draft service is not configured');
      try {
        const draft = await deps.financialDrafts.prepare({ ...(validatedInput as TransactionCreateInput), userId, ...turn, executionId });
        await deps.conversations.finalize({ executionId, ...turn, status: 'SUCCEEDED', turnStatus: 'SUCCEEDED', assistantContent: draft.renderedText, assistantSource: 'DETERMINISTIC_RENDERER', durationMs: Date.now() - startedAt, outputSummary: { draftId: draft.draftId, operation: 'transaction.create', status: 'PENDING_CONFIRMATION' } });
        return { httpStatus: 200, response: { status: 'success', renderedText: draft.renderedText, data: draft, correlationId, ...turn } };
      } catch (error) {
        const operational = error instanceof AssistantError ? error : { message: 'Assistant draft preparation failed', statusCode: 500, code: 'ASSISTANT_DRAFT_PREPARATION_FAILED' };
        await deps.conversations.finalize({ executionId, ...turn, status: 'FAILED', turnStatus: 'FAILED', assistantContent: operational.message, assistantSource: 'SAFE_ERROR', durationMs: Date.now() - startedAt, safeErrorCode: operational.code }).catch(() => undefined);
        return { httpStatus: operational.statusCode, response: { status: 'error', code: operational.code, message: operational.message, correlationId, ...turn } };
      }
    }
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
