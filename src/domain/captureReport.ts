// ============================================================
// Capture-quality report (Phase 39.0) — pure computation over already-
// fetched assistant_capture_events rows (Phase 35.1). Never touches the
// database. Every metric is split per (source, phaseMarker) group, so Web vs
// Telegram and baseline vs a later phase are compared side by side.
//
// Window semantics are cohort-based: a draft/clarification belongs to the
// window when it was CREATED/REQUESTED inside it; its terminal event is
// counted whenever it happened. A draft with no terminal event older than
// the draft TTL is "abandoned past TTL" — lazy expiry never wrote it.
// ============================================================

import { ASSISTANT_FINANCIAL_DRAFT_TTL_MS } from '../assistant/financial-draft';

export interface CaptureEventRow {
  readonly occurredAt: Date;
  readonly eventType: string;
  readonly source: string;
  readonly phaseMarker: string;
  readonly correlationKey: string;
  readonly fields: readonly string[];
  readonly origin: string | null;
}

export const INSUFFICIENT_DATA = 'INSUFFICIENT DATA';
/** A ratio, or INSUFFICIENT_DATA when its denominator is below minSamples. */
export type Rate = { readonly value: number | typeof INSUFFICIENT_DATA; readonly numerator: number; readonly denominator: number };

export interface CaptureReportGroup {
  readonly source: string;
  readonly phaseMarker: string;
  /** Messages that entered capture: a direct draft or a first-step clarification. */
  readonly captureStarts: number;
  /** Metric 1 — clarification per field, rate over capture starts. */
  readonly clarificationByField: Record<string, Rate>;
  readonly draftsCreated: number;
  /** Metric 4 — direct draft vs after clarification. */
  readonly directDraftRate: Rate;
  readonly outcomes: {
    readonly confirmed: number;
    readonly cancelled: number;
    readonly expired: number;
    readonly abandonedPastTtl: number;
    readonly failed: number;
    readonly open: number;
  };
  /** Metric 3 — cancelled over drafts created. */
  readonly cancelRate: Rate;
  /** Metric 2 — drafts edited before confirm, over drafts confirmed (edits are only recorded at confirm). */
  readonly editRate: Rate;
  readonly editedByField: Record<string, number>;
}

export interface CaptureReportOptions {
  readonly from: Date;
  readonly to: Date;
  readonly now: Date;
  readonly minSamples: number;
}

const TERMINAL: Record<string, keyof CaptureReportGroup['outcomes']> = {
  DRAFT_CONFIRMED: 'confirmed',
  DRAFT_CANCELLED: 'cancelled',
  DRAFT_EXPIRED: 'expired',
  DRAFT_FAILED: 'failed',
};

export function computeCaptureReport(rows: readonly CaptureEventRow[], options: CaptureReportOptions): CaptureReportGroup[] {
  const rate = (numerator: number, denominator: number): Rate => ({
    value: denominator < options.minSamples || denominator === 0 ? INSUFFICIENT_DATA : Math.round((numerator / denominator) * 10000) / 10000,
    numerator,
    denominator,
  });
  const inWindow = (row: CaptureEventRow) => row.occurredAt >= options.from && row.occurredAt < options.to;

  const byKey = new Map<string, CaptureEventRow[]>();
  for (const row of rows) byKey.set(row.correlationKey, [...(byKey.get(row.correlationKey) ?? []), row]);

  const groups = new Map<string, CaptureEventRow[]>();
  for (const row of rows.filter(inWindow)) {
    const key = `${row.source}\u0000${row.phaseMarker}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.values()].map((events) => {
    const created = events.filter((e) => e.eventType === 'DRAFT_CREATED');
    const requested = events.filter((e) => e.eventType === 'CLARIFICATION_REQUESTED');
    const direct = created.filter((e) => e.origin === 'DIRECT').length;
    const captureStarts = direct + requested.filter((e) => e.origin === 'DIRECT').length;

    const fieldCounts: Record<string, number> = {};
    for (const e of requested) for (const f of e.fields) fieldCounts[f] = (fieldCounts[f] ?? 0) + 1;

    const outcomes = { confirmed: 0, cancelled: 0, expired: 0, abandonedPastTtl: 0, failed: 0, open: 0 };
    const editedByField: Record<string, number> = {};
    let edited = 0;
    for (const draft of created) {
      const related = byKey.get(draft.correlationKey) ?? [];
      const terminal = related.find((e) => TERMINAL[e.eventType]);
      if (terminal) outcomes[TERMINAL[terminal.eventType]!] += 1;
      else if (options.now.getTime() - draft.occurredAt.getTime() > ASSISTANT_FINANCIAL_DRAFT_TTL_MS) outcomes.abandonedPastTtl += 1;
      else outcomes.open += 1;
      const edit = related.find((e) => e.eventType === 'DRAFT_EDITED');
      if (edit) {
        edited += 1;
        for (const f of edit.fields) editedByField[f] = (editedByField[f] ?? 0) + 1;
      }
    }

    return {
      source: events[0]!.source,
      phaseMarker: events[0]!.phaseMarker,
      captureStarts,
      clarificationByField: Object.fromEntries(Object.entries(fieldCounts).map(([f, n]) => [f, rate(n, captureStarts)])),
      draftsCreated: created.length,
      directDraftRate: rate(direct, created.length),
      outcomes,
      cancelRate: rate(outcomes.cancelled, created.length),
      editRate: rate(edited, outcomes.confirmed),
      editedByField,
    };
  }).sort((a, b) => a.phaseMarker.localeCompare(b.phaseMarker) || a.source.localeCompare(b.source));
}
