"use strict";
// ============================================================
// Operator remediation — safety gates & fixed-field update payloads
// (Phase 29, PD-019)
// ------------------------------------------------------------
// Pure and DB-free: takes already-fetched rows and either says whether an
// action is allowed, or returns the exact, fixed set of fields that action is
// allowed to write. The caller (src/scripts/opsRemediate.ts) still re-checks
// the same precondition in the actual `updateMany` `where` clause — these
// gates are the single source of truth for what "eligible" means, not a
// substitute for the DB-level guard against a raced/changed row.
//
// Nothing here calls into Assistant Core, a transaction service, or Prisma.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.canMarkReviewed = canMarkReviewed;
exports.canRequeueOutbound = canRequeueOutbound;
exports.canReconcileStaleTurn = canReconcileStaleTurn;
exports.buildMarkReviewedUpdate = buildMarkReviewedUpdate;
exports.buildRequeueOutboundUpdate = buildRequeueOutboundUpdate;
exports.buildReconcileTurnUpdate = buildReconcileTurnUpdate;
const opsVisibility_1 = require("./opsVisibility");
/** Only an ambiguous, already-terminal inbound job may be marked reviewed. */
function canMarkReviewed(job) {
    return job.status === 'FAILED_TERMINAL' && (0, opsVisibility_1.isAmbiguousExecution)(job);
}
/** Only a terminal outbound delivery may be requeued. */
function canRequeueOutbound(delivery) {
    return delivery.status === 'FAILED_TERMINAL';
}
/** Only a still-RUNNING turn, stale past `thresholdMs`, may be reconciled. */
function canReconcileStaleTurn(turn, now, thresholdMs) {
    return turn.status === 'RUNNING' && now.getTime() - turn.startedAt.getTime() >= thresholdMs;
}
/**
 * Fields for marking an ambiguous ChannelInboundJob reviewed. Deliberately
 * excludes `status`/`attempt`/`availableAt`/`errorCategory` — the job can
 * never be reclaimed/reprocessed by this action, so the Assistant is never
 * re-invoked as a side effect of an operator's review note.
 */
function buildMarkReviewedUpdate(operator, note, now = new Date()) {
    return {
        reviewedAt: now,
        reviewedBy: operator,
        reviewNote: note,
    };
}
/**
 * Fields for requeuing a terminal ChannelOutboundDelivery. Matches the
 * runbook §8.1 SQL precedent exactly (attempt reset to 0). Only re-sends an
 * already-rendered message — never references `renderedText`, `replyMarkup`,
 * or `inboundJobId`, so it cannot change *what* gets sent or touch the
 * originating inbound job.
 */
function buildRequeueOutboundUpdate(now = new Date()) {
    return {
        status: 'PENDING',
        availableAt: now,
        attempt: 0,
        errorCategory: null,
        leaseOwner: null,
        leaseExpiresAt: null,
    };
}
/**
 * Fields for reconciling a stale RUNNING AssistantTurn. The exact subset
 * `conversation.service.ts`'s own `finalizeRejected` writes on a normal
 * failure path — never touches AssistantFinancialDraft, AssistantIdempotencyRecord,
 * or Transaction.
 */
function buildReconcileTurnUpdate(now = new Date()) {
    return {
        status: 'FAILED',
        safeErrorCode: 'operator_reconciled_stale_turn',
        finishedAt: now,
    };
}
//# sourceMappingURL=opsRemediation.js.map