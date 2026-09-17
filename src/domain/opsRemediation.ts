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

import { isAmbiguousExecution } from './opsVisibility';

export interface RemediableInboundJob {
  status: string;
  errorCategory: string | null;
}

export interface RemediableOutboundDelivery {
  status: string;
}

export interface RemediableAssistantTurn {
  status: string;
  startedAt: Date;
}

/** Only an ambiguous, already-terminal inbound job may be marked reviewed. */
export function canMarkReviewed(job: RemediableInboundJob): boolean {
  return job.status === 'FAILED_TERMINAL' && isAmbiguousExecution(job);
}

/** Only a terminal outbound delivery may be requeued. */
export function canRequeueOutbound(delivery: RemediableOutboundDelivery): boolean {
  return delivery.status === 'FAILED_TERMINAL';
}

/** Only a still-RUNNING turn, stale past `thresholdMs`, may be reconciled. */
export function canReconcileStaleTurn(turn: RemediableAssistantTurn, now: Date, thresholdMs: number): boolean {
  return turn.status === 'RUNNING' && now.getTime() - turn.startedAt.getTime() >= thresholdMs;
}

/**
 * Fields for marking an ambiguous ChannelInboundJob reviewed. Deliberately
 * excludes `status`/`attempt`/`availableAt`/`errorCategory` — the job can
 * never be reclaimed/reprocessed by this action, so the Assistant is never
 * re-invoked as a side effect of an operator's review note.
 */
export function buildMarkReviewedUpdate(operator: string, note: string, now: Date = new Date()) {
  return {
    reviewedAt: now,
    reviewedBy: operator,
    reviewNote: note,
  } as const;
}

/**
 * Fields for requeuing a terminal ChannelOutboundDelivery. Matches the
 * runbook §8.1 SQL precedent exactly (attempt reset to 0). Only re-sends an
 * already-rendered message — never references `renderedText`, `replyMarkup`,
 * or `inboundJobId`, so it cannot change *what* gets sent or touch the
 * originating inbound job.
 */
export function buildRequeueOutboundUpdate(now: Date = new Date()) {
  return {
    status: 'PENDING',
    availableAt: now,
    attempt: 0,
    errorCategory: null,
    leaseOwner: null,
    leaseExpiresAt: null,
  } as const;
}

/**
 * Fields for reconciling a stale RUNNING AssistantTurn. The exact subset
 * `conversation.service.ts`'s own `finalizeRejected` writes on a normal
 * failure path — never touches AssistantFinancialDraft, AssistantIdempotencyRecord,
 * or Transaction.
 */
export function buildReconcileTurnUpdate(now: Date = new Date()) {
  return {
    status: 'FAILED',
    safeErrorCode: 'operator_reconciled_stale_turn',
    finishedAt: now,
  } as const;
}
