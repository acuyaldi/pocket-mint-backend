"use strict";
// ============================================================
// Categorization controller
// ------------------------------------------------------------
// Thin HTTP handler: validates auth, parses query params,
// delegates to the categorization service, returns typed
// response. Follows the existing controller conventions.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestions = getSuggestions;
const categorization_service_1 = require("../services/categorization.service");
const authContext_1 = require("../http/authContext");
const forwardError_1 = require("../http/forwardError");
const response_1 = require("../utils/response");
const VALID_TYPES = ['INCOME', 'EXPENSE'];
/**
 * GET /api/v1/categories/suggestions?description=...&type=EXPENSE
 *
 * Returns up to 5 ranked category suggestions for the given
 * transaction description. Suggestions are ordered by confidence
 * (HIGH → MEDIUM → LOW).
 *
 * Query params:
 *   description — the transaction description/merchant text
 *   type        — "INCOME" or "EXPENSE" (default: "EXPENSE")
 */
async function getSuggestions(req, res, next) {
    try {
        const userId = (0, authContext_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        const description = typeof req.query.description === 'string'
            ? req.query.description
            : '';
        const typeParam = typeof req.query.type === 'string'
            ? req.query.type.toUpperCase()
            : 'EXPENSE';
        if (!VALID_TYPES.includes(typeParam)) {
            return (0, response_1.sendError)(res, 'type must be INCOME or EXPENSE', 400);
        }
        const suggestions = await categorization_service_1.categorizationService.getSuggestions(userId, description, typeParam);
        return (0, response_1.sendSuccess)(res, suggestions, 'Category suggestions');
    }
    catch (error) {
        return (0, forwardError_1.forwardError)(error, res, next);
    }
}
//# sourceMappingURL=categorization.controller.js.map