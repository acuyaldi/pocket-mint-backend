"use strict";
// ============================================================
// Assistant Core — deterministic intent resolver
// ------------------------------------------------------------
// Maps a provider-neutral canonical request to a known intent
// and tool. For Phase 21.2, only one intent is supported:
// `analytics.monthly-spending-summary`.
//
// A future provider adapter will translate natural language
// into the canonical intent structure; this resolver is the
// deterministic reference implementation.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveIntent = resolveIntent;
const errors_1 = require("./errors");
/** Supported intents (allow-listed — not an open registry). */
const SUPPORTED_INTENTS = new Set([
    'analytics.monthly-spending-summary',
]);
/**
 * Resolve a canonical request to a known intent.
 *
 * - Only allow-listed intents are accepted.
 * - The intent ID is the tool ID (1:1 mapping for now).
 * - Arguments pass through — the tool's validateInput is the
 *   gate, not the resolver.
 */
function resolveIntent(request) {
    if (!SUPPORTED_INTENTS.has(request.intent)) {
        throw errors_1.AssistantError.unsupportedIntent(request.intent);
    }
    return {
        toolId: request.intent,
        arguments: request.arguments,
    };
}
//# sourceMappingURL=intent.js.map