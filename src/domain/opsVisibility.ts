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

/** Terminal-execution categories PD-015/PD-016 mark as needing manual inspection. */
export const AMBIGUOUS_ERROR_CATEGORIES = [
  'ambiguous_assistant_execution',
  'ambiguous_callback_execution',
] as const;

// ponytail: fixed 5-minute heuristic, not per-intent or per-environment tuned.
// Upgrade path: an env var (e.g. STALE_RUNNING_TURN_MS) if this proves too
// noisy (legitimately slow provider calls) or too lax in practice.
export const STALE_RUNNING_TURN_MS = 5 * 60 * 1000;

export function isAmbiguousExecution(row: { errorCategory: string | null }): boolean {
  return row.errorCategory != null && (AMBIGUOUS_ERROR_CATEGORIES as readonly string[]).includes(row.errorCategory);
}

export interface SafeInboundJobRow {
  id: string;
  provider: string;
  status: string;
  attempt: number;
  errorCategory: string | null;
  assistantTurnId: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export function toSafeInboundJobRow(row: {
  id: string;
  provider: string;
  status: string;
  attempt: number;
  errorCategory: string | null;
  assistantTurnId: string | null;
  createdAt: Date;
  completedAt: Date | null;
}): SafeInboundJobRow {
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

export interface SafeOutboundDeliveryRow {
  id: string;
  inboundJobId: string;
  provider: string;
  status: string;
  attempt: number;
  errorCategory: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

export function toSafeOutboundDeliveryRow(row: {
  id: string;
  inboundJobId: string;
  provider: string;
  status: string;
  attempt: number;
  errorCategory: string | null;
  createdAt: Date;
  sentAt: Date | null;
}): SafeOutboundDeliveryRow {
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

export interface SafeAssistantTurnRow {
  id: string;
  conversationId: string;
  correlationId: string;
  intent: string;
  status: string;
  startedAt: Date;
}

export function toSafeAssistantTurnRow(row: {
  id: string;
  conversationId: string;
  correlationId: string;
  intent: string;
  status: string;
  startedAt: Date;
}): SafeAssistantTurnRow {
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
export function summarizeByErrorCategory(rows: Array<{ errorCategory: string | null }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = row.errorCategory ?? '(none)';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
