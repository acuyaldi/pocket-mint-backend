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
export declare function canMarkReviewed(job: RemediableInboundJob): boolean;
/** Only a terminal outbound delivery may be requeued. */
export declare function canRequeueOutbound(delivery: RemediableOutboundDelivery): boolean;
/** Only a still-RUNNING turn, stale past `thresholdMs`, may be reconciled. */
export declare function canReconcileStaleTurn(turn: RemediableAssistantTurn, now: Date, thresholdMs: number): boolean;
/**
 * Fields for marking an ambiguous ChannelInboundJob reviewed. Deliberately
 * excludes `status`/`attempt`/`availableAt`/`errorCategory` — the job can
 * never be reclaimed/reprocessed by this action, so the Assistant is never
 * re-invoked as a side effect of an operator's review note.
 */
export declare function buildMarkReviewedUpdate(operator: string, note: string, now?: Date): {
    readonly reviewedAt: Date;
    readonly reviewedBy: string;
    readonly reviewNote: string;
};
/**
 * Fields for requeuing a terminal ChannelOutboundDelivery. Matches the
 * runbook §8.1 SQL precedent exactly (attempt reset to 0). Only re-sends an
 * already-rendered message — never references `renderedText`, `replyMarkup`,
 * or `inboundJobId`, so it cannot change *what* gets sent or touch the
 * originating inbound job.
 */
export declare function buildRequeueOutboundUpdate(now?: Date): {
    readonly status: "PENDING";
    readonly availableAt: Date;
    readonly attempt: 0;
    readonly errorCategory: null;
    readonly leaseOwner: null;
    readonly leaseExpiresAt: null;
};
/**
 * Fields for reconciling a stale RUNNING AssistantTurn. The exact subset
 * `conversation.service.ts`'s own `finalizeRejected` writes on a normal
 * failure path — never touches AssistantFinancialDraft, AssistantIdempotencyRecord,
 * or Transaction.
 */
export declare function buildReconcileTurnUpdate(now?: Date): {
    readonly status: "FAILED";
    readonly safeErrorCode: "operator_reconciled_stale_turn";
    readonly finishedAt: Date;
};
