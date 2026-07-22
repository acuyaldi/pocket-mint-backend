"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveAssistantConversation = exports.getAssistantConversation = exports.listAssistantConversations = exports.assistantExecute = void 0;
exports.createAssistantControllers = createAssistantControllers;
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const response_1 = require("../utils/response");
const bootstrap_1 = require("../assistant/bootstrap");
function canonicalRequest(body) {
    if (typeof body !== 'object' || body === null)
        return false;
    const value = body;
    return typeof value.intent === 'string' &&
        (value.message === undefined || typeof value.message === 'string') &&
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
function createAssistantControllers(application, conversations) {
    async function execute(req, res, next) {
        try {
            const userId = (0, authContext_1.getAuthenticatedUserId)(req);
            if (!userId)
                return (0, response_1.sendError)(res, 'Unauthorized', 401);
            if (!canonicalRequest(req.body))
                return (0, response_1.sendError)(res, 'Request body must include a string "intent" field and valid optional fields', 400, 'BAD_REQUEST');
            const result = await application.execute(userId, req.correlationId, req.body);
            if (result.response.status === 'success')
                return (0, response_1.sendSuccess)(res, result.response, 'Assistant executed successfully');
            res.status(result.httpStatus).json({ success: false, error: { ...result.response, statusCode: result.httpStatus } });
        }
        catch (error) {
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
    return { execute, list, get, archive };
}
const controllers = createAssistantControllers(bootstrap_1.assistantApplicationService, bootstrap_1.assistantConversationService);
exports.assistantExecute = controllers.execute;
exports.listAssistantConversations = controllers.list;
exports.getAssistantConversation = controllers.get;
exports.archiveAssistantConversation = controllers.archive;
//# sourceMappingURL=assistant.controller.js.map