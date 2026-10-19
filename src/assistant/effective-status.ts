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

export const CLARIFICATION_EXPIRED_TERMINAL_CODE = 'expired';

export function effectiveDraftStatus<S extends string>(
  draft: { readonly status: S; readonly expiresAt: Date },
  now: Date,
): S | 'EXPIRED' {
  return draft.status === 'PENDING_CONFIRMATION' && draft.expiresAt <= now ? 'EXPIRED' : draft.status;
}

/** A past-TTL PENDING clarification is effectively `STALE` + `terminalCode: 'expired'` — exactly what its lazy write stores. */
export function effectiveClarificationStatus<S extends string>(
  request: { readonly status: S; readonly terminalCode: string | null; readonly expiresAt: Date },
  now: Date,
): { status: S | 'STALE'; terminalCode: string | null } {
  return request.status === 'PENDING' && request.expiresAt <= now
    ? { status: 'STALE', terminalCode: CLARIFICATION_EXPIRED_TERMINAL_CODE }
    : { status: request.status, terminalCode: request.terminalCode };
}
