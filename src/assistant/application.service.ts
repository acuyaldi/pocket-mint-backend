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
import type {
  TransactionCreateInput,
  TransactionCreateToolInput,
} from './tools';
import type { AssistantFinancialDraftService } from './financial-draft.service';
import type { AssistantContextService, BuildAssistantExecutionContextInput } from './context.service';
import {
  MERCHANT_TRANSACTION_CREATE_CONSTRAINTS,
  WALLET_TRANSACTION_CREATE_CONSTRAINTS,
  toPublicEntityResolutionResult,
  type EntityResolutionResult,
  type EntityResolutionService,
} from './entity-resolution';

export interface AssistantApplicationResult { response: AssistantCanonicalResponse; httpStatus: number }

export function createAssistantApplicationService(deps: {
  conversations: AssistantConversationService;
  contexts?: AssistantContextService;
  toolRegistry: ToolRegistry;
  handlerRegistry: HandlerRegistry;
  financialDrafts?: AssistantFinancialDraftService;
  entityResolution?: EntityResolutionService;
}) {
  async function prepareProviderExecution(input: BuildAssistantExecutionContextInput) {
    if (!deps.contexts) throw new Error('Assistant context service is not configured');
    return deps.contexts.buildExecutionContext(input);
  }

  async function execute(userId: string, correlationId: string, request: AssistantCanonicalRequest): Promise<AssistantApplicationResult> {
    const locale = request.locale?.trim() || 'id-ID';
    if (request.conversationId) await deps.conversations.assertContinuable(userId, request.conversationId);
    const provided = normalizeProvidedMessage(request.message);
    let resolved: ReturnType<typeof resolveIntent>;
    let validatedInput: { month: string } | TransactionCreateToolInput;
    try {
      resolved = resolveIntent(request);
      const contract = deps.toolRegistry.get(resolved.toolId);
      if (!contract) throw AssistantError.toolNotFound(resolved.toolId);
      validatedInput = contract.validateInput(resolved.arguments) as
        | { month: string }
        | TransactionCreateToolInput;
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
        const transactionInput = validatedInput as TransactionCreateToolInput;
        const walletResolution = 'walletReference' in transactionInput
          ? await resolveTransactionWallet(
            deps.entityResolution,
            userId,
            transactionInput.walletReference,
          )
          : undefined;
        if (walletResolution && walletResolution.kind !== 'resolved') {
          const publicResolution = toPublicEntityResolutionResult(walletResolution);
          if (walletResolution.kind === 'ambiguous' || walletResolution.kind === 'not_found') {
            const message = renderWalletClarification(walletResolution);
            await deps.conversations.finalize({
              executionId,
              ...turn,
              status: 'SUCCEEDED',
              turnStatus: 'CLARIFICATION_REQUIRED',
              assistantContent: message,
              assistantSource: 'DETERMINISTIC_RENDERER',
              durationMs: Date.now() - startedAt,
              outputSummary: {
                operation: 'transaction.create',
                walletResolution: walletResolution.kind,
              },
            });
            return {
              httpStatus: 200,
              response: {
                status: 'clarification_required',
                message,
                data: publicResolution,
                correlationId,
                ...turn,
              },
            };
          }
          const invalid = AssistantError.invalidInput(
            'transaction.create',
            'walletReference is invalid',
          );
          const safeMessage = safeRejectedAssistantMessage(invalid.code);
          await deps.conversations.finalize({
            executionId,
            ...turn,
            status: 'FAILED',
            turnStatus: 'REJECTED',
            assistantContent: safeMessage,
            assistantSource: 'SAFE_ERROR',
            durationMs: Date.now() - startedAt,
            safeErrorCode: invalid.code,
            outputSummary: {
              operation: 'transaction.create',
              walletResolution: publicResolution.kind,
            },
          });
          return {
            httpStatus: invalid.statusCode,
            response: {
              status: 'rejected',
              code: invalid.code,
              message: safeMessage,
              correlationId,
              ...turn,
            },
          };
        }
        const merchantResolution = transactionInput.merchantReference === undefined
          ? undefined
          : await resolveTransactionMerchant(
            deps.entityResolution,
            userId,
            transactionInput.merchantReference,
          );
        if (merchantResolution?.kind === 'ambiguous') {
          const publicResolution = toPublicEntityResolutionResult(merchantResolution);
          const message = renderMerchantClarification(merchantResolution);
          await deps.conversations.finalize({
            executionId,
            ...turn,
            status: 'SUCCEEDED',
            turnStatus: 'CLARIFICATION_REQUIRED',
            assistantContent: message,
            assistantSource: 'DETERMINISTIC_RENDERER',
            durationMs: Date.now() - startedAt,
            outputSummary: {
              operation: 'transaction.create',
              merchantResolution: merchantResolution.kind,
            },
          });
          return {
            httpStatus: 200,
            response: {
              status: 'clarification_required',
              message,
              data: publicResolution,
              correlationId,
              ...turn,
            },
          };
        }
        if (
          merchantResolution
          && merchantResolution.kind !== 'resolved'
          && merchantResolution.kind !== 'not_found'
        ) {
          const invalid = AssistantError.invalidInput(
            'transaction.create',
            'merchantReference is invalid',
          );
          const safeMessage = safeRejectedAssistantMessage(invalid.code);
          await deps.conversations.finalize({
            executionId,
            ...turn,
            status: 'FAILED',
            turnStatus: 'REJECTED',
            assistantContent: safeMessage,
            assistantSource: 'SAFE_ERROR',
            durationMs: Date.now() - startedAt,
            safeErrorCode: invalid.code,
            outputSummary: {
              operation: 'transaction.create',
              merchantResolution: merchantResolution.kind,
            },
          });
          return {
            httpStatus: invalid.statusCode,
            response: {
              status: 'rejected',
              code: invalid.code,
              message: safeMessage,
              correlationId,
              ...turn,
            },
          };
        }
        const merchantDisplayLabel = merchantResolution?.kind === 'resolved'
          ? merchantResolution.displayLabel
          : merchantResolution?.kind === 'not_found'
            ? safeFreeFormMerchantText(merchantResolution.normalizedReference)
            : undefined;
        const walletId = walletResolution
          ? walletResolution.entity.internalId
          : (transactionInput as TransactionCreateInput).walletId;
        const draftInput: TransactionCreateInput = {
          type: transactionInput.type,
          amount: transactionInput.amount,
          walletId,
          categoryId: transactionInput.categoryId,
          date: transactionInput.date,
          ...(
            transactionInput.description !== undefined
              ? { description: transactionInput.description }
              : merchantDisplayLabel === undefined
                ? {}
                : { description: merchantDisplayLabel }
          ),
        };
        const draft = await deps.financialDrafts.prepare({
          ...draftInput,
          ...(walletResolution === undefined
            ? {}
            : { walletDisplayLabel: walletResolution.displayLabel }),
          ...(merchantDisplayLabel === undefined
            ? {}
            : { merchantDisplayLabel }),
          userId,
          ...turn,
          executionId,
        });
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
  return { execute, prepareProviderExecution };
}

export type AssistantApplicationService = ReturnType<typeof createAssistantApplicationService>;

async function resolveTransactionWallet(
  service: EntityResolutionService | undefined,
  authenticatedUserId: string,
  walletReference: string,
): Promise<EntityResolutionResult> {
  if (!service) throw new Error('Entity resolution service is not configured');
  return service.resolve({
    authenticatedUserId,
    reference: {
      entityType: 'wallet',
      referenceText: walletReference,
      source: 'provider_extracted',
    },
    trustedConstraints: WALLET_TRANSACTION_CREATE_CONSTRAINTS,
  });
}

async function resolveTransactionMerchant(
  service: EntityResolutionService | undefined,
  authenticatedUserId: string,
  merchantReference: string,
): Promise<EntityResolutionResult> {
  if (!service) throw new Error('Entity resolution service is not configured');
  return service.resolve({
    authenticatedUserId,
    reference: {
      entityType: 'merchant',
      referenceText: merchantReference,
      source: 'provider_extracted',
    },
    trustedConstraints: MERCHANT_TRANSACTION_CREATE_CONSTRAINTS,
  });
}

function safeFreeFormMerchantText(normalizedReference: string): string {
  if (
    !normalizedReference
    || Buffer.byteLength(normalizedReference, 'utf8') > 256
    || /[<>\u0000-\u001f\u007f-\u009f]/u.test(normalizedReference)
  ) {
    throw AssistantError.invalidInput(
      'transaction.create',
      'merchantReference is invalid',
    );
  }
  return normalizedReference;
}

function renderWalletClarification(
  resolution: Extract<EntityResolutionResult, { kind: 'ambiguous' | 'not_found' }>,
): string {
  if (resolution.kind === 'not_found') {
    return 'Wallet tersebut tidak ditemukan atau tidak dapat digunakan. Sebutkan nama wallet aktif yang lain.';
  }
  const options = resolution.options
    .map((option) =>
      option.discriminator
        ? `${option.displayLabel} (${option.discriminator})`
        : option.displayLabel)
    .join(', ');
  return `Wallet yang dimaksud belum jelas. Pilih salah satu: ${options}.`;
}

function renderMerchantClarification(
  resolution: Extract<EntityResolutionResult, { kind: 'ambiguous' }>,
): string {
  const options = resolution.options
    .map((option) => option.displayLabel)
    .join(', ');
  return `Merchant yang dimaksud belum jelas. Pilih salah satu: ${options}.`;
}
