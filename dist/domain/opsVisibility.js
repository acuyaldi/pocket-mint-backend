"use strict";
// ============================================================
// Operator diagnostics — safe projections & aggregation (Phase 28, PD-018)
// ------------------------------------------------------------
// Pure and read-only: takes already-fetched rows and returns a safe,
// explicitly-allowlisted shape plus small aggregations. Never touches the
// database and never forwards a field outside each projector's fixed list —
// this is the redaction control, independent of the caller's Prisma `select`.
//
// Never projected: message text, rendered outbound content, reply markup, or
// any external provider identifier (externalSenderId/externalChatId/
// callbackQueryId/callbackMessageId). Matches the field set the deployment
// runbook's own operator SQL already uses.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.STALE_RUNNING_TURN_MS = exports.AMBIGUOUS_ERROR_CATEGORIES = void 0;
exports.isAmbiguousExecution = isAmbiguousExecution;
exports.toSafeInboundJobRow = toSafeInboundJobRow;
exports.toSafeOutboundDeliveryRow = toSafeOutboundDeliveryRow;
exports.toSafeAssistantTurnRow = toSafeAssistantTurnRow;
exports.summarizeByErrorCategory = summarizeByErrorCategory;
/** Terminal-execution categories PD-015/PD-016 mark as needing manual inspection. */
exports.AMBIGUOUS_ERROR_CATEGORIES = [
    'ambiguous_assistant_execution',
    'ambiguous_callback_execution',
];
// ponytail: fixed 5-minute heuristic, not per-intent or per-environment tuned.
// Upgrade path: an env var (e.g. STALE_RUNNING_TURN_MS) if this proves too
// noisy (legitimately slow provider calls) or too lax in practice.
exports.STALE_RUNNING_TURN_MS = 5 * 60 * 1000;
function isAmbiguousExecution(row) {
    return row.errorCategory != null && exports.AMBIGUOUS_ERROR_CATEGORIES.includes(row.errorCategory);
}
function toSafeInboundJobRow(row) {
    return {
        id: row.id,
        provider: row.provider,
        status: row.status,
        attempt: row.attempt,
        errorCategory: row.errorCategory,
        assistantTurnId: row.assistantTurnId,
        createdAt: row.createdAt,
        completedAt: row.completedAt,
    };
}
function toSafeOutboundDeliveryRow(row) {
    return {
        id: row.id,
        inboundJobId: row.inboundJobId,
        provider: row.provider,
        status: row.status,
        attempt: row.attempt,
        errorCategory: row.errorCategory,
        createdAt: row.createdAt,
        sentAt: row.sentAt,
    };
}
function toSafeAssistantTurnRow(row) {
    return {
        id: row.id,
        conversationId: row.conversationId,
        correlationId: row.correlationId,
        intent: row.intent,
        status: row.status,
        startedAt: row.startedAt,
    };
}
/** Groups rows by `errorCategory` (nulls bucketed as `'(none)'`), counted only. */
function summarizeByErrorCategory(rows) {
    const counts = {};
    for (const row of rows) {
        const key = row.errorCategory ?? '(none)';
        counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
}
//# sourceMappingURL=opsVisibility.js.map