import type { NextFunction, Request, Response } from 'express';
import { getAuthenticatedUserId } from '../http/authContext';
import { forwardError } from '../http/forwardError';
import { sendError, sendSuccess } from '../utils/response';
import { assistantApplicationService, assistantConversationService, assistantFinancialDraftService } from '../assistant/bootstrap';
import type { AssistantApplicationService } from '../assistant/application.service';
import type { AssistantConversationService } from '../assistant/conversation.service';
import type { AssistantCanonicalRequest } from '../assistant/types';
import type { AssistantFinancialDraftService } from '../assistant/financial-draft.service';

function canonicalRequest(body: unknown): body is AssistantCanonicalRequest {
  if (typeof body !== 'object' || body === null) return false;
  const value = body as Record<string, unknown>;
  return typeof value.intent === 'string' &&
    (value.message === undefined || typeof value.message === 'string') &&
    (value.conversationId === undefined || typeof value.conversationId === 'string') &&
    (value.locale === undefined || typeof value.locale === 'string');
}

const intQuery = (value: unknown): number | undefined => {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string' || !/^\d+$/.test(text)) return undefined;
  return Number(text);
};

const routeId = (value: string | string[]): string => Array.isArray(value) ? value[0] : value;

export function createAssistantControllers(application: AssistantApplicationService, conversations: AssistantConversationService, drafts?: AssistantFinancialDraftService) {
  async function execute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      if (!canonicalRequest(req.body)) return sendError(res, 'Request body must include a string "intent" field and valid optional fields', 400, 'BAD_REQUEST');
      const result = await application.execute(userId, req.correlationId, req.body);
      if (result.response.status === 'success') return sendSuccess(res, result.response, 'Assistant executed successfully');
      res.status(result.httpStatus).json({ success: false, error: { ...result.response, statusCode: result.httpStatus } });
    } catch (error) { forwardError(error, res, next); }
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

  async function archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      sendSuccess(res, await conversations.archiveOwnedConversation(userId, routeId(req.params.conversationId)), 'Conversation archived');
    } catch (error) { forwardError(error, res, next); }
  }
  async function confirmDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      if (!drafts) return sendError(res, 'Assistant financial drafts unavailable', 503);
      const result = await drafts.confirm(userId, routeId(req.params.draftId), req.header('Idempotency-Key'), req.correlationId);
      sendSuccess(res, result, 'Financial draft confirmed');
    } catch (error) { forwardError(error, res, next); }
  }
  async function cancelDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return sendError(res, 'Unauthorized', 401);
      if (!drafts) return sendError(res, 'Assistant financial drafts unavailable', 503);
      sendSuccess(res, await drafts.cancel(userId, routeId(req.params.draftId), req.correlationId), 'Financial draft cancelled');
    } catch (error) { forwardError(error, res, next); }
  }
  return { execute, list, get, archive, confirmDraft, cancelDraft };
}

const controllers = createAssistantControllers(assistantApplicationService, assistantConversationService, assistantFinancialDraftService);
export const assistantExecute = controllers.execute;
export const listAssistantConversations = controllers.list;
export const getAssistantConversation = controllers.get;
export const archiveAssistantConversation = controllers.archive;
export const confirmAssistantFinancialDraft = controllers.confirmDraft;
export const cancelAssistantFinancialDraft = controllers.cancelDraft;
