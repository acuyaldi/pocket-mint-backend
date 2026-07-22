"use strict";
// ============================================================
// Assistant controller
// ------------------------------------------------------------
// Thin HTTP mapping over Assistant Core. Accepts a canonical
// request (not a provider-specific payload), resolves through
// the deterministic pipeline, and returns the canonical
// response envelope. Uses existing auth, error handling, and
// response utilities unchanged.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.assistantExecute = assistantExecute;
const authContext_1 = require("../http/authContext");
const response_1 = require("../utils/response");
const forwardError_1 = require("../http/forwardError");
const intent_1 = require("../assistant/intent");
const executor_1 = require("../assistant/executor");
const renderer_1 = require("../assistant/renderer");
const bootstrap_1 = require("../assistant/bootstrap");
/** Structural guard for the request body. */
function isCanonicalRequest(body) {
    if (typeof body !== 'object' || body === null)
        return false;
    const b = body;
    return typeof b.intent === 'string';
}
/**
 * POST /v1/assistant/execute
 *
 * Authenticated. Accepts a provider-neutral canonical request.
 * Never accepts a caller-supplied user ID — identity comes from
 * the verified JWT via `req.auth`.
 */
async function assistantExecute(req, res, next) {
    try {
        // Auth
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            (0, response_1.sendError)(res, 'Unauthorized', 401);
            return;
        }
        // Validate request body
        if (!isCanonicalRequest(req.body)) {
            (0, response_1.sendError)(res, 'Request body must include a string "intent" field', 400, 'BAD_REQUEST');
            return;
        }
        const correlationId = req.correlationId;
        // Helper: send an operational Assistant error with the correlation ID
        // visible in the body (the header was already set by correlationMiddleware).
        function sendAssistantError(message, statusCode, code) {
            res.status(statusCode).json({
                success: false,
                error: { code, statusCode, message, correlationId },
            });
        }
        // Resolve intent (allow-listed)
        let resolved;
        try {
            resolved = (0, intent_1.resolveIntent)(req.body);
        }
        catch (err) {
            if ((0, forwardError_1.isOperationalError)(err)) {
                sendAssistantError(err.message, err.statusCode, err.code);
            }
            else {
                next(err);
            }
            return;
        }
        // Build trusted execution context
        const ctx = {
            userId,
            correlationId,
            conversationId: req.body.conversationId,
            timestamp: new Date(),
        };
        // Execute
        let result;
        try {
            result = await (0, executor_1.executeTool)(resolved.toolId, resolved.arguments, ctx, bootstrap_1.toolRegistry, bootstrap_1.handlerRegistry);
        }
        catch (err) {
            if ((0, forwardError_1.isOperationalError)(err)) {
                sendAssistantError(err.message, err.statusCode, err.code);
            }
            else {
                next(err);
            }
            return;
        }
        // Render
        const renderedText = (0, renderer_1.renderMonthlySpendingSummary)(result.output);
        // Build canonical response
        const response = {
            status: 'success',
            renderedText,
            data: result.output,
            correlationId,
        };
        (0, response_1.sendSuccess)(res, response, 'Assistant executed successfully');
    }
    catch (err) {
        (0, forwardError_1.forwardError)(err, res, next);
    }
}
//# sourceMappingURL=assistant.controller.js.map