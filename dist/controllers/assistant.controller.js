"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelAssistantClarification = exports.selectAssistantClarification = exports.cancelAssistantFinancialDraft = exports.confirmAssistantFinancialDraft = exports.deleteAssistantConversation = exports.restoreAssistantConversation = exports.archiveAssistantConversation = exports.getAssistantRecoveryState = exports.getAssistantConversation = exports.listAssistantConversations = exports.assistantMessages = exports.assistantExecute = void 0;
exports.createAssistantControllers = createAssistantControllers;
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const response_1 = require("../utils/response");
const bootstrap_1 = require("../assistant/bootstrap");
const logger_1 = require("../utils/logger");
const errorCategory_1 = require("../utils/errorCategory");
function canonicalRequest(body) {
    if (typeof body !== 'object' || body === null)
        return false;
    const value = body;
    return typeof value.intent === 'string' &&
        (value.message === undefined || typeof value.message === 'string') &&
        (value.conversationId === undefined || typeof value.conversationId === 'string') &&
        (value.locale === undefined || typeof value.locale === 'string');
}
function providerMessageRequest(body) {
    if (typeof body !== 'object' || body === null || Array.isArray(body))
        return false;
    const value = body;
    const keys = Object.keys(value).sort();
    // `locale` is an optional BCP-47 reply-language hint (e.g. "id-ID" / "en-US").
    // Any other unknown key is still rejected — no widening of the accepted body.
    if (keys.some((key) => key !== 'conversationId' && key !== 'message' && key !== 'locale'))
        return false;
    return typeof value.message === 'string' &&
        Boolean(value.message.trim()) &&
        (value.conversationId === undefined || typeof value.conversationId === 'string') &&
        (value.locale === undefined || typeof value.locale === 'string');
}
const intQuery = (value) => {
    const text = Array.isArray(value) ? value[0] : value;
    if (typeof text !== 'string' || !/^\d+$/.test(text))
        return undefined;
    return Number(text);
};
const routeId = (value) => Array.isArray(value) ? value[0] : value;
/** Bounded boolean signal only — never inspects/logs the draft content itself. */
function draftWasCreated(response) {
    if (typeof response !== 'object' || response === null)
        return false;
    const value = response;
    return value.status === 'success' && value.data?.confirmationRequired === true;
}
/** Closed allowlist for the bounded clarification-kind log label — never widened to an arbitrary string from a response payload. */
const CLARIFICATION_KINDS = new Set(['wallet', 'merchant', 'category', 'transaction_fields', 'provider_text']);
/** Bounded clarification-kind label only ('wallet'/'merchant'/'category'/'transaction_fields'/'provider_text') — never the prompt text or options. */
function clarificationKindOf(response) {
    if (typeof response !== 'object' || response === null)
        return undefined;
    const value = response;
    if (value.status !== 'clarification_required')
        return undefined;
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
function logCaptureLifecycle(requestId, response, captureSource) {
    if (draftWasCreated(response)) {
        (0, logger_1.logEvent)('info', { event: 'assistant.capture.draft_created', requestId, captureSource });
        return;
    }
    const clarificationKind = clarificationKindOf(response);
    if (clarificationKind) {
        (0, logger_1.logEvent)('info', { event: 'assistant.capture.clarification_required', requestId, clarificationKind });
    }
}
/** Strict body for clarification continuation — either one option token or one guided fields object. */
function selectClarificationRequest(body) {
    if (typeof body !== 'object' || body === null || Array.isArray(body))
        return false;
    const value = body;
    const keys = Object.keys(value);
    if (keys.length !== 1)
        return false;
    if (keys[0] === 'optionToken') {
        return typeof value.optionToken === 'string' && value.optionToken.trim().length > 0;
    }
    if (keys[0] === 'fields') {
        return typeof value.fields === 'object' && value.fields !== null && !Array.isArray(value.fields);
    }
    return false;
}
/** Strictly parses the confirm-draft override payload. Returns `null` when the body shape is invalid (not an object, or contains unknown keys). */
function readDraftConfirmOverride(body) {
    // undefined body (no Content-Type or empty) → no overrides, use all draft values
    if (body === undefined || body === '')
        return undefined;
    if (typeof body !== 'object' || body === null || Array.isArray(body))
        return null;
    const value = body;
    const allowed = new Set(['amount', 'walletId', 'toWalletId', 'categoryId', 'description', 'date']);
    const keys = Object.keys(value);
    if (keys.some((k) => !allowed.has(k)))
        return null;
    const overrides = {};
    if ('amount' in value) {
        if (typeof value.amount !== 'number' || value.amount <= 0 || !Number.isFinite(value.amount))
            return null;
        overrides.amount = value.amount;
    }
    if ('walletId' in value) {
        if (typeof value.walletId !== 'string' || !value.walletId.trim())
            return null;
        overrides.walletId = value.walletId;
    }
    if ('toWalletId' in value) {
        if (typeof value.toWalletId !== 'string' || !value.toWalletId.trim())
            return null;
        overrides.toWalletId = value.toWalletId;
    }
    if ('categoryId' in value) {
        if (typeof value.categoryId !== 'string' || !value.categoryId.trim())
            return null;
        overrides.categoryId = value.categoryId;
    }
    if ('description' in value) {
        if (typeof value.description !== 'string')
            return null;
        overrides.description = value.description;
    }
    if ('date' in value) {
        if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date))
            return null;
        overrides.date = value.date;
    }
    return Object.keys(overrides).length > 0 ? overrides : undefined;
}
function createAssistantControllers(application, conversations, drafts, providerRuntime) {
    async function execute(req, res, next) {
        const elapsed = (0, logger_1.startTimer)();
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            if (!canonicalRequest(req.body))
                return (0, response_1.sendError)(res, 'Request body must include a string "intent" field and valid optional fields', 400, 'BAD_REQUEST');
            (0, logger_1.logEvent)('info', { event: 'assistant.message.received', requestId: req.correlationId, operation: 'execute' });
            const { idempotencyOutcome, ...result } = await application.execute(userId, req.correlationId, req.body, req.header('Idempotency-Key'));
            (0, logger_1.logEvent)('info', {
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
            if (idempotencyOutcome !== 'replay')
                logCaptureLifecycle(req.correlationId, result.response, 'direct');
            if (result.response.status === 'success')
                return (0, response_1.sendSuccess)(res, result.response, 'Assistant executed successfully');
            res.status(result.httpStatus).json({ success: false, error: { ...result.response, statusCode: result.httpStatus } });
        }
        catch (error) {
            (0, logger_1.logEvent)('error', { event: 'assistant.message.failed', requestId: req.correlationId, operation: 'execute', durationMs: elapsed(), errorCategory: (0, errorCategory_1.categorizeError)(error) });
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function messages(req, res, next) {
        const elapsed = (0, logger_1.startTimer)();
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            if (!providerRuntime)
                return (0, response_1.sendError)(res, 'Assistant provider is unavailable', 503, 'ASSISTANT_PROVIDER_UNAVAILABLE');
            if (!providerMessageRequest(req.body)) {
                return (0, response_1.sendError)(res, 'Request body must include a non-empty string "message" and an optional string "conversationId"', 400, 'BAD_REQUEST');
            }
            (0, logger_1.logEvent)('info', { event: 'assistant.message.received', requestId: req.correlationId, operation: 'messages' });
            const { idempotencyOutcome, ...result } = await providerRuntime.sendMessage(userId, req.correlationId, {
                message: req.body.message,
                ...(req.body.conversationId === undefined ? {} : { conversationId: req.body.conversationId }),
                ...(req.body.locale === undefined ? {} : { locale: req.body.locale }),
            }, req.header('Idempotency-Key'));
            (0, logger_1.logEvent)('info', {
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
            if (idempotencyOutcome !== 'replay')
                logCaptureLifecycle(req.correlationId, result.response, 'direct');
            if (result.response.status === 'error' || result.response.status === 'rejected') {
                return void res.status(result.httpStatus).json({
                    success: false,
                    error: { ...result.response, statusCode: result.httpStatus },
                });
            }
            (0, response_1.sendSuccess)(res, result.response, 'Assistant message processed');
        }
        catch (error) {
            (0, logger_1.logEvent)('error', { event: 'assistant.message.failed', requestId: req.correlationId, operation: 'messages', durationMs: elapsed(), errorCategory: (0, errorCategory_1.categorizeError)(error) });
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function list(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            (0, response_1.sendSuccess)(res, await conversations.listOwnedConversations(userId, intQuery(req.query.page), intQuery(req.query.limit)));
        }
        catch (error) {
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function get(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            (0, response_1.sendSuccess)(res, await conversations.getOwnedConversation(userId, routeId(req.params.conversationId), intQuery(req.query.page), intQuery(req.query.limit)));
        }
        catch (error) {
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function recoveryState(req, res, next) {
        const elapsed = (0, logger_1.startTimer)();
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const conversationId = routeId(req.params.conversationId);
            // getAssistantState only filters by {conversationId, userId} in its queries — it
            // does not verify the conversation exists, so a bad id would silently look like
            // "no active workflow" instead of 404. Verify ownership first, same as `get`.
            await conversations.assertOwned(userId, conversationId);
            (0, logger_1.logEvent)('info', { event: 'assistant.recovery.requested', requestId: req.correlationId });
            const state = await application.getAssistantState(userId, conversationId);
            const hasActiveClarification = Boolean(state.activeClarification);
            const hasPendingDraft = Boolean(state.pendingDraft);
            const hasTerminalClarification = Boolean(state.latestTerminalClarification);
            const hasActiveTurn = Boolean(state.activeTurn);
            const resolved = hasActiveClarification || hasPendingDraft || hasTerminalClarification || hasActiveTurn;
            (0, logger_1.logEvent)('info', {
                event: resolved ? 'assistant.recovery.resolved' : 'assistant.recovery.unresolved',
                requestId: req.correlationId,
                durationMs: elapsed(),
                hasActiveClarification,
                hasPendingDraft,
                hasTerminalClarification,
                hasActiveTurn,
            });
            (0, response_1.sendSuccess)(res, state);
        }
        catch (error) {
            (0, logger_1.logEvent)('error', { event: 'assistant.recovery.unresolved', requestId: req.correlationId, durationMs: elapsed(), errorCategory: (0, errorCategory_1.categorizeError)(error) });
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function archive(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            (0, response_1.sendSuccess)(res, await conversations.archiveOwnedConversation(userId, routeId(req.params.conversationId)), 'Conversation archived');
        }
        catch (error) {
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function restore(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            (0, response_1.sendSuccess)(res, await conversations.restoreOwnedConversation(userId, routeId(req.params.conversationId)), 'Conversation restored');
        }
        catch (error) {
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function remove(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            (0, response_1.sendSuccess)(res, await conversations.deleteOwnedConversation(userId, routeId(req.params.conversationId)), 'Conversation deleted');
        }
        catch (error) {
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function confirmDraft(req, res, next) {
        const elapsed = (0, logger_1.startTimer)();
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            if (!drafts)
                return (0, response_1.sendError)(res, 'Assistant financial drafts unavailable', 503);
            const overrides = readDraftConfirmOverride(req.body);
            if (overrides === null)
                return (0, response_1.sendError)(res, 'Request body must be a JSON object with optional fields: amount, walletId, toWalletId, categoryId, description, date', 400, 'BAD_REQUEST');
            const { idempotencyOutcome, ...result } = await drafts.confirm(userId, routeId(req.params.draftId), req.header('Idempotency-Key'), req.correlationId, overrides);
            (0, logger_1.logEvent)('info', {
                event: 'assistant.draft.confirmed',
                requestId: req.correlationId,
                durationMs: elapsed(),
                idempotencyOutcome,
                idempotentReplay: idempotencyOutcome === 'replay',
            });
            if (idempotencyOutcome !== 'replay') {
                (0, logger_1.logEvent)('info', {
                    event: 'assistant.capture.draft_confirmed',
                    requestId: req.correlationId,
                    overridesUsed: overrides !== undefined,
                });
            }
            (0, response_1.sendSuccess)(res, result, 'Financial draft confirmed');
        }
        catch (error) {
            (0, logger_1.logEvent)('warn', { event: 'assistant.draft.confirmed', requestId: req.correlationId, durationMs: elapsed(), outcome: 'failed', errorCategory: (0, errorCategory_1.categorizeError)(error) });
            if ((0, errorCategory_1.categorizeError)(error) === 'expired') {
                (0, logger_1.logEvent)('info', { event: 'assistant.capture.draft_expired', requestId: req.correlationId });
            }
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function cancelDraft(req, res, next) {
        const elapsed = (0, logger_1.startTimer)();
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            if (!drafts)
                return (0, response_1.sendError)(res, 'Assistant financial drafts unavailable', 503);
            const result = await drafts.cancel(userId, routeId(req.params.draftId), req.correlationId);
            (0, logger_1.logEvent)('info', { event: 'assistant.draft.cancelled', requestId: req.correlationId, durationMs: elapsed(), outcome: result.status });
            if (result.status === 'EXPIRED') {
                (0, logger_1.logEvent)('info', { event: 'assistant.capture.draft_expired', requestId: req.correlationId });
            }
            else if (result.status === 'CANCELLED' && 'turnId' in result) {
                (0, logger_1.logEvent)('info', { event: 'assistant.capture.draft_cancelled', requestId: req.correlationId });
            }
            (0, response_1.sendSuccess)(res, result, 'Financial draft cancelled');
        }
        catch (error) {
            (0, logger_1.logEvent)('warn', { event: 'assistant.draft.cancelled', requestId: req.correlationId, durationMs: elapsed(), outcome: 'failed', errorCategory: (0, errorCategory_1.categorizeError)(error) });
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function selectClarification(req, res, next) {
        const elapsed = (0, logger_1.startTimer)();
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            if (!selectClarificationRequest(req.body)) {
                return (0, response_1.sendError)(res, 'Request body must include a non-empty string "optionToken" and no other fields', 400, 'BAD_REQUEST');
            }
            const conversationId = routeId(req.params.conversationId);
            const clarificationId = routeId(req.params.clarificationId);
            const result = 'optionToken' in req.body
                ? await application.selectClarification(userId, req.correlationId, req.body.optionToken, conversationId, clarificationId)
                : await application.submitGuidedClarification(userId, req.correlationId, req.body.fields, conversationId, clarificationId);
            (0, logger_1.logEvent)('info', {
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
            (0, response_1.sendSuccess)(res, result.response, 'Clarification processed');
        }
        catch (error) {
            (0, logger_1.logEvent)('error', { event: 'assistant.clarification.selected', requestId: req.correlationId, durationMs: elapsed(), outcome: 'failed', errorCategory: (0, errorCategory_1.categorizeError)(error) });
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    async function cancelClarification(req, res, next) {
        const elapsed = (0, logger_1.startTimer)();
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            const conversationId = routeId(req.params.conversationId);
            const clarificationId = routeId(req.params.clarificationId);
            const result = await application.cancelClarification(userId, req.correlationId, clarificationId, conversationId);
            (0, logger_1.logEvent)('info', {
                event: 'assistant.clarification.cancelled',
                requestId: req.correlationId,
                durationMs: elapsed(),
                outcome: result.response.status,
                httpStatus: result.httpStatus,
            });
            if (result.response.status === 'success') {
                const value = result.response.data;
                const clarificationKind = typeof value?.entityType === 'string' && CLARIFICATION_KINDS.has(value.entityType) ? value.entityType : undefined;
                (0, logger_1.logEvent)('info', {
                    event: 'assistant.capture.clarification_cancelled',
                    requestId: req.correlationId,
                    clarificationKind,
                });
            }
            if (result.response.status === 'error' || result.response.status === 'rejected') {
                return void res.status(result.httpStatus).json({ success: false, error: { ...result.response, statusCode: result.httpStatus } });
            }
            (0, response_1.sendSuccess)(res, result.response, 'Clarification cancelled');
        }
        catch (error) {
            (0, logger_1.logEvent)('error', { event: 'assistant.clarification.cancelled', requestId: req.correlationId, durationMs: elapsed(), outcome: 'failed', errorCategory: (0, errorCategory_1.categorizeError)(error) });
            (0, forwardError_1.forwardError)(error, res, next);
        }
    }
    return { execute, messages, list, get, recoveryState, archive, restore, remove, confirmDraft, cancelDraft, selectClarification, cancelClarification };
}
const controllers = createAssistantControllers(bootstrap_1.assistantApplicationService, bootstrap_1.assistantConversationService, bootstrap_1.assistantFinancialDraftService, bootstrap_1.assistantProviderRuntime);
exports.assistantExecute = controllers.execute;
exports.assistantMessages = controllers.messages;
exports.listAssistantConversations = controllers.list;
exports.getAssistantConversation = controllers.get;
exports.getAssistantRecoveryState = controllers.recoveryState;
exports.archiveAssistantConversation = controllers.archive;
exports.restoreAssistantConversation = controllers.restore;
exports.deleteAssistantConversation = controllers.remove;
exports.confirmAssistantFinancialDraft = controllers.confirmDraft;
exports.cancelAssistantFinancialDraft = controllers.cancelDraft;
exports.selectAssistantClarification = controllers.selectClarification;
exports.cancelAssistantClarification = controllers.cancelClarification;
//# sourceMappingURL=assistant.controller.js.map