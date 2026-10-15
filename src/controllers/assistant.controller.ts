import type { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';
import { sendError, sendSuccess } from '../utils/response';
import { assistantApplicationService, assistantConversationService, assistantFinancialDraftService, assistantProviderRuntime } from '../assistant/bootstrap';
import type { AssistantApplicationService } from '../assistant/application.service';
import type { AssistantConversationService } from '../assistant/conversation.service';
import type { AssistantCanonicalRequest } from '../assistant/types';
import type { AssistantFinancialDraftService, DraftConfirmOverride } from '../assistant/financial-draft.service';
import type { AssistantProviderRuntime } from '../assistant/provider-runtime';
import { logEvent, startTimer } from '../utils/logger';
import { categorizeError } from '../utils/errorCategory';

function canonicalRequest(body: unknown): body is AssistantCanonicalRequest {
  if (typeof body !== 'object' || body === null) return false;
  const value = body as Record<string, unknown>;
  return typeof value.intent === 'string' &&
    (value.message === undefined || typeof value.message === 'string') &&
    (value.conversationId === undefined || typeof value.conversationId === 'string') &&
    (value.locale === undefined || typeof value.locale === 'string');
}

function providerMessageRequest(body: unknown): body is { message: string; conversationId?: string; locale?: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
  const value = body as Record<string, unknown>;
  const keys = Object.keys(value).sort();
  // `locale` is an optional BCP-47 reply-language hint (e.g. "id-ID" / "en-US").
  // Any other unknown key is still rejected — no widening of the accepted body.
  if (keys.some((key) => key !== 'conversationId' && key !== 'message' && key !== 'locale')) return false;
  return typeof value.message === 'string' &&
    Boolean(value.message.trim()) &&
    (value.conversationId === undefined || typeof value.conversationId === 'string') &&
    (value.locale === undefined || typeof value.locale === 'string');
}

const intQuery = (value: unknown): number | undefined => {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string' || !/^\d+$/.test(text)) return undefined;
  return Number(text);
};

const routeId = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;

/** Bounded boolean signal only — never inspects/logs the draft content itself. */
function draftWasCreated(response: unknown): boolean {
  if (typeof response !== 'object' || response === null) return false;
  const value = response as { status?: unknown; data?: { confirmationRequired?: unknown } };
  return value.status === 'success' && value.data?.confirmationRequired === true;
}

/** Closed allowlist for the bounded clarification-kind log label — never widened to an arbitrary string from a response payload. */
const CLARIFICATION_KINDS = new Set(['wallet', 'merchant', 'category', 'transaction_fields', 'provider_text']);

/** Bounded clarification-kind label only ('wallet'/'merchant'/'category'/'transaction_fields'/'provider_text') — never the prompt text or options. */
function clarificationKindOf(response: unknown): string | undefined {
  if (typeof response !== 'object' || response === null) return undefined;
  const value = response as { status?: unknown; data?: { kind?: unknown; entityType?: unknown } };
  if (value.status !== 'clarification_required') return undefined;
  if (value.data?.kind === 'entity_selection' && typeof value.data.entityType === 'string' && CLARIFICATION_KINDS.has(value.data.entityType)) {
    return value.data.entityType;
  }
  return 'provider_text';
}

/**
 * Privacy-safe capture-quality signals (Phase 35) — fired alongside the
 * existing ops events above, never in place of them. Only a bounded
 * outcome/kind/source label ever leaves this function; never message text,
 * amounts, wallet/category ids, or any other draft/clarification content.
 */
function logCaptureLifecycle(requestId: string, response: unknown, captureSource: 'direct' | 'clarification_resolved'): void {
  if (draftWasCreated(response)) {
    logEvent('info', { event: 'assistant.capture.draft_created', requestId, captureSource });
    return;
  }
  const clarificationKind = clarificationKindOf(response);
  if (clarificationKind) {
    logEvent('info', { event: 'assistant.capture.clarification_required', requestId, clarificationKind });
  }
}

type ClarificationContinuationRequest =
  | { optionToken: string }
  | { fields: Record<string, unknown> };

/** Strict body for clarification continuation — either one option token or one guided fields object. */
function selectClarificationRequest(body: unknown): body is ClarificationContinuationRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
  const value = body as Record<string, unknown>;
  const keys = Object.keys(value);
  if (keys.length !== 1) return false;
  if (keys[0] === 'optionToken') {
    return typeof value.optionToken === 'string' && value.optionToken.trim().length > 0;
  }
  if (keys[0] === 'fields') {
    return typeof value.fields === 'object' && value.fields !== null && !Array.isArray(value.fields);
  }
  return false;
}

/** Strictly parses the confirm-draft override payload. Returns `null` when the body shape is invalid (not an object, or contains unknown keys). */
function readDraftConfirmOverride(body: unknown): DraftConfirmOverride | null | undefined {
  // undefined body (no Content-Type or empty) → no overrides, use all draft values
  if (body === undefined || body === '') return undefined;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  const allowed = new Set(['amount', 'walletId', 'categoryId', 'description', 'date']);
  const keys = Object.keys(value);
  if (keys.some((k) => !allowed.has(k))) return null;
  const overrides: DraftConfirmOverride = {};
  if ('amount' in value) {
    if (typeof value.amount !== 'number' || value.amount <= 0 || !Number.isFinite(value.amount)) return null;
    overrides.amount = value.amount;
  }
  if ('walletId' in value) {
    if (typeof value.walletId !== 'string' || !value.walletId.trim()) return null;
    overrides.walletId = value.walletId;
  }
  if ('categoryId' in value) {
    if (typeof value.categoryId !== 'string' || !value.categoryId.trim()) return null;
    overrides.categoryId = value.categoryId;
  }
  if ('description' in value) {
    if (typeof value.description !== 'string') return null;
    overrides.description = value.description;
  }
  if ('date' in value) {
    if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
    overrides.date = value.date;
  }
  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

export function createAssistantControllers(
  application: AssistantApplicationService,
  conversations: AssistantConversationService,
  drafts?: AssistantFinancialDraftService,
  providerRuntime?: AssistantProviderRuntime,
) {
  async function execute(req: Request, res: Response, next: NextFunction): Promise<void> {
    const elapsed = startTimer();
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      if (!canonicalRequest(req.body)) return sendError(res, 'Request body must include a string "intent" field and valid optional fields', 400, 'BAD_REQUEST');
      logEvent('info', { event: 'assistant.message.received', requestId: req.correlationId, operation: 'execute' });
      const { idempotencyOutcome, ...result } = await application.execute(userId, req.correlationId, req.body, req.header('Idempotency-Key'));
      logEvent('info', {
        event: 'assistant.message.completed',
        requestId: req.correlationId,
        operation: 'execute',
        outcome: result.response.status,
        httpStatus: result.httpStatus,
        durationMs: elapsed(),
        clarificationRequired: result.response.status === 'clarification_required',
        draftCreated: draftWasCreated(result.response),
        idempotencyOutcome,
        idempotentReplay: idempotencyOutcome === 'replay',
      });
      if (idempotencyOutcome !== 'replay') logCaptureLifecycle(req.correlationId, result.response, 'direct');
      if (result.response.status === 'success') return sendSuccess(res, result.response, 'Assistant executed successfully');
      res.status(result.httpStatus).json({ success: false, error: { ...result.response, statusCode: result.httpStatus } });
    } catch (error) {
      logEvent('error', { event: 'assistant.message.failed', requestId: req.correlationId, operation: 'execute', durationMs: elapsed(), errorCategory: categorizeError(error) });
      forwardError(error, res, next);
    }
  }

  async function messages(req: Request, res: Response, next: NextFunction): Promise<void> {
    const elapsed = startTimer();
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      if (!providerRuntime) return sendError(res, 'Assistant provider is unavailable', 503, 'ASSISTANT_PROVIDER_UNAVAILABLE');
      if (!providerMessageRequest(req.body)) {
        return sendError(res, 'Request body must include a non-empty string "message" and an optional string "conversationId"', 400, 'BAD_REQUEST');
      }
      logEvent('info', { event: 'assistant.message.received', requestId: req.correlationId, operation: 'messages' });
      const { idempotencyOutcome, ...result } = await providerRuntime.sendMessage(userId, req.correlationId, {
        message: req.body.message,
        ...(req.body.conversationId === undefined ? {} : { conversationId: req.body.conversationId }),
        ...(req.body.locale === undefined ? {} : { locale: req.body.locale }),
      }, req.header('Idempotency-Key'));
      logEvent('info', {
        event: 'assistant.message.completed',
        requestId: req.correlationId,
        operation: 'messages',
        outcome: result.response.status,
        httpStatus: result.httpStatus,
        durationMs: elapsed(),
        clarificationRequired: result.response.status === 'clarification_required',
        draftCreated: draftWasCreated(result.response),
        idempotencyOutcome,
        idempotentReplay: idempotencyOutcome === 'replay',
      });
      if (idempotencyOutcome !== 'replay') logCaptureLifecycle(req.correlationId, result.response, 'direct');
      if (result.response.status === 'error' || result.response.status === 'rejected') {
        return void res.status(result.httpStatus).json({
          success: false,
          error: { ...result.response, statusCode: result.httpStatus },
        });
      }
      sendSuccess(res, result.response, 'Assistant message processed');
    } catch (error) {
      logEvent('error', { event: 'assistant.message.failed', requestId: req.correlationId, operation: 'messages', durationMs: elapsed(), errorCategory: categorizeError(error) });
      forwardError(error, res, next);
    }
  }

  async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      sendSuccess(res, await conversations.listOwnedConversations(userId, intQuery(req.query.page), intQuery(req.query.limit)));
    } catch (error) { forwardError(error, res, next); }
  }

  async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      sendSuccess(res, await conversations.getOwnedConversation(userId, routeId(req.params.conversationId), intQuery(req.query.page), intQuery(req.query.limit)));
    } catch (error) { forwardError(error, res, next); }
  }

  async function recoveryState(req: Request, res: Response, next: NextFunction): Promise<void> {
    const elapsed = startTimer();
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      const conversationId = routeId(req.params.conversationId);
      // getAssistantState only filters by {conversationId, userId} in its queries — it
      // does not verify the conversation exists, so a bad id would silently look like
      // "no active workflow" instead of 404. Verify ownership first, same as `get`.
      await conversations.assertOwned(userId, conversationId);
      logEvent('info', { event: 'assistant.recovery.requested', requestId: req.correlationId });
      const state = await application.getAssistantState(userId, conversationId);
      const hasActiveClarification = Boolean(state.activeClarification);
      const hasPendingDraft = Boolean(state.pendingDraft);
      const hasTerminalClarification = Boolean(state.latestTerminalClarification);
      const hasActiveTurn = Boolean(state.activeTurn);
      const resolved = hasActiveClarification || hasPendingDraft || hasTerminalClarification || hasActiveTurn;
      logEvent('info', {
        event: resolved ? 'assistant.recovery.resolved' : 'assistant.recovery.unresolved',
        requestId: req.correlationId,
        durationMs: elapsed(),
        hasActiveClarification,
        hasPendingDraft,
        hasTerminalClarification,
        hasActiveTurn,
      });
      sendSuccess(res, state);
    } catch (error) {
      logEvent('error', { event: 'assistant.recovery.unresolved', requestId: req.correlationId, durationMs: elapsed(), errorCategory: categorizeError(error) });
      forwardError(error, res, next);
    }
  }
  async function archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      sendSuccess(res, await conversations.archiveOwnedConversation(userId, routeId(req.params.conversationId)), 'Conversation archived');
    } catch (error) { forwardError(error, res, next); }
  }
  async function restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      sendSuccess(res, await conversations.restoreOwnedConversation(userId, routeId(req.params.conversationId)), 'Conversation restored');
    } catch (error) { forwardError(error, res, next); }
  }
  async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      sendSuccess(res, await conversations.deleteOwnedConversation(userId, routeId(req.params.conversationId)), 'Conversation deleted');
    } catch (error) { forwardError(error, res, next); }
  }
  async function confirmDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    const elapsed = startTimer();
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      if (!drafts) return sendError(res, 'Assistant financial drafts unavailable', 503);
      const overrides = readDraftConfirmOverride(req.body);
      if (overrides === null) return sendError(res, 'Request body must be a JSON object with optional fields: amount, walletId, categoryId, description, date', 400, 'BAD_REQUEST');
      const { idempotencyOutcome, ...result } = await drafts.confirm(userId, routeId(req.params.draftId), req.header('Idempotency-Key'), req.correlationId, overrides);
      logEvent('info', {
        event: 'assistant.draft.confirmed',
        requestId: req.correlationId,
        durationMs: elapsed(),
        idempotencyOutcome,
        idempotentReplay: idempotencyOutcome === 'replay',
      });
      if (idempotencyOutcome !== 'replay') {
        logEvent('info', {
          event: 'assistant.capture.draft_confirmed',
          requestId: req.correlationId,
          overridesUsed: overrides !== undefined,
        });
      }
      sendSuccess(res, result, 'Financial draft confirmed');
    } catch (error) {
      logEvent('warn', { event: 'assistant.draft.confirmed', requestId: req.correlationId, durationMs: elapsed(), outcome: 'failed', errorCategory: categorizeError(error) });
      if (categorizeError(error) === 'expired') {
        logEvent('info', { event: 'assistant.capture.draft_expired', requestId: req.correlationId });
      }
      forwardError(error, res, next);
    }
  }
  async function cancelDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    const elapsed = startTimer();
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      if (!drafts) return sendError(res, 'Assistant financial drafts unavailable', 503);
      const result = await drafts.cancel(userId, routeId(req.params.draftId), req.correlationId);
      logEvent('info', { event: 'assistant.draft.cancelled', requestId: req.correlationId, durationMs: elapsed(), outcome: result.status });
      if (result.status === 'EXPIRED') {
        logEvent('info', { event: 'assistant.capture.draft_expired', requestId: req.correlationId });
      } else if (result.status === 'CANCELLED' && 'turnId' in result) {
        logEvent('info', { event: 'assistant.capture.draft_cancelled', requestId: req.correlationId });
      }
      sendSuccess(res, result, 'Financial draft cancelled');
    } catch (error) {
      logEvent('warn', { event: 'assistant.draft.cancelled', requestId: req.correlationId, durationMs: elapsed(), outcome: 'failed', errorCategory: categorizeError(error) });
      forwardError(error, res, next);
    }
  }
  async function selectClarification(req: Request, res: Response, next: NextFunction): Promise<void> {
    const elapsed = startTimer();
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      if (!selectClarificationRequest(req.body)) {
        return sendError(res, 'Request body must include a non-empty string "optionToken" and no other fields', 400, 'BAD_REQUEST');
      }
      const conversationId = routeId(req.params.conversationId);
      const clarificationId = routeId(req.params.clarificationId);
      const result = 'optionToken' in req.body
        ? await application.selectClarification(userId, req.correlationId, req.body.optionToken, conversationId, clarificationId)
        : await application.submitGuidedClarification(userId, req.correlationId, req.body.fields, conversationId, clarificationId);
      logEvent('info', {
        event: 'assistant.clarification.selected',
        requestId: req.correlationId,
        durationMs: elapsed(),
        outcome: result.response.status,
        httpStatus: result.httpStatus,
        chainedClarification: result.response.status === 'clarification_required',
        draftCreated: draftWasCreated(result.response),
      });
      logCaptureLifecycle(req.correlationId, result.response, 'clarification_resolved');
      if (result.response.status === 'error' || result.response.status === 'rejected') {
        return void res.status(result.httpStatus).json({ success: false, error: { ...result.response, statusCode: result.httpStatus } });
      }
      sendSuccess(res, result.response, 'Clarification processed');
    } catch (error) {
      logEvent('error', { event: 'assistant.clarification.selected', requestId: req.correlationId, durationMs: elapsed(), outcome: 'failed', errorCategory: categorizeError(error) });
      forwardError(error, res, next);
    }
  }
  async function cancelClarification(req: Request, res: Response, next: NextFunction): Promise<void> {
    const elapsed = startTimer();
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      const conversationId = routeId(req.params.conversationId);
      const clarificationId = routeId(req.params.clarificationId);
      const result = await application.cancelClarification(userId, req.correlationId, clarificationId, conversationId);
      logEvent('info', {
        event: 'assistant.clarification.cancelled',
        requestId: req.correlationId,
        durationMs: elapsed(),
        outcome: result.response.status,
        httpStatus: result.httpStatus,
      });
      if (result.response.status === 'success') {
        const value = result.response.data as { entityType?: unknown } | undefined;
        const clarificationKind = typeof value?.entityType === 'string' && CLARIFICATION_KINDS.has(value.entityType) ? value.entityType : undefined;
        logEvent('info', {
          event: 'assistant.capture.clarification_cancelled',
          requestId: req.correlationId,
          clarificationKind,
        });
      }
      if (result.response.status === 'error' || result.response.status === 'rejected') {
        return void res.status(result.httpStatus).json({ success: false, error: { ...result.response, statusCode: result.httpStatus } });
      }
      sendSuccess(res, result.response, 'Clarification cancelled');
    } catch (error) {
      logEvent('error', { event: 'assistant.clarification.cancelled', requestId: req.correlationId, durationMs: elapsed(), outcome: 'failed', errorCategory: categorizeError(error) });
      forwardError(error, res, next);
    }
  }
  return { execute, messages, list, get, recoveryState, archive, restore, remove, confirmDraft, cancelDraft, selectClarification, cancelClarification };
}

const controllers = createAssistantControllers(assistantApplicationService, assistantConversationService, assistantFinancialDraftService, assistantProviderRuntime);
export const assistantExecute = controllers.execute;
export const assistantMessages = controllers.messages;
export const listAssistantConversations = controllers.list;
export const getAssistantConversation = controllers.get;
export const getAssistantRecoveryState = controllers.recoveryState;
export const archiveAssistantConversation = controllers.archive;
export const restoreAssistantConversation = controllers.restore;
export const deleteAssistantConversation = controllers.remove;
export const confirmAssistantFinancialDraft = controllers.confirmDraft;
export const cancelAssistantFinancialDraft = controllers.cancelDraft;
export const selectAssistantClarification = controllers.selectClarification;
export const cancelAssistantClarification = controllers.cancelClarification;
