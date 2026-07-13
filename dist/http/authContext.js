"use strict";
// ============================================================
// Canonical authenticated request context (HTTP boundary)
// ------------------------------------------------------------
// One authoritative representation of "who is making this request", written by
// `requireUser` after authentication succeeds and read by controllers through
// the small helpers below. This is the ONLY source of authenticated identity:
// controllers never read `x-user-id`, never verify tokens, and never accept a
// user id from the request body or query. See src/types/express.d.ts for the
// `req.auth` declaration-merge that makes this type visible on every Request.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticatedUserId = getAuthenticatedUserId;
/**
 * The authenticated user id, or `undefined` when absent. Pure read — never
 * inspects headers, never verifies a token, never sends a response. Each
 * controller decides how to react to `undefined` (its existing status code),
 * so this helper stays free of HTTP-response concerns.
 */
function getAuthenticatedUserId(req) {
    return req.auth?.userId;
}
//# sourceMappingURL=authContext.js.map