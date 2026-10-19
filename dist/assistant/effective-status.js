"use strict";
// ============================================================
// Effective lifecycle status — lazy-expiry normalization (Phase 38.1)
// ------------------------------------------------------------
// Drafts and clarifications only flip to their expired terminal state lazily,
// the next time something acts on them (docs/assistant-stuck-states.md). The
// status column therefore lags reality for a row nobody touched after its TTL.
// These two pure functions are the single definition of "what status is this
// row really in at `now`": every mutation path decides whether to perform the
// lazy write from them, and every read path (recovery-state) reports them —
// so a read never disagrees with what the next write would do.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLARIFICATION_EXPIRED_TERMINAL_CODE = void 0;
exports.effectiveDraftStatus = effectiveDraftStatus;
exports.effectiveClarificationStatus = effectiveClarificationStatus;
exports.CLARIFICATION_EXPIRED_TERMINAL_CODE = 'expired';
function effectiveDraftStatus(draft, now) {
    return draft.status === 'PENDING_CONFIRMATION' && draft.expiresAt <= now ? 'EXPIRED' : draft.status;
}
/** A past-TTL PENDING clarification is effectively `STALE` + `terminalCode: 'expired'` — exactly what its lazy write stores. */
function effectiveClarificationStatus(request, now) {
    return request.status === 'PENDING' && request.expiresAt <= now
        ? { status: 'STALE', terminalCode: exports.CLARIFICATION_EXPIRED_TERMINAL_CODE }
        : { status: request.status, terminalCode: request.terminalCode };
}
//# sourceMappingURL=effective-status.js.map