"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSUFFICIENT_DATA = void 0;
exports.computeCaptureReport = computeCaptureReport;
const financial_draft_1 = require("../assistant/financial-draft");
exports.INSUFFICIENT_DATA = 'INSUFFICIENT DATA';
const TERMINAL = {
    DRAFT_CONFIRMED: 'confirmed',
    DRAFT_CANCELLED: 'cancelled',
    DRAFT_EXPIRED: 'expired',
    DRAFT_FAILED: 'failed',
};
function computeCaptureReport(rows, options) {
    const rate = (numerator, denominator) => ({
        value: denominator < options.minSamples || denominator === 0 ? exports.INSUFFICIENT_DATA : Math.round((numerator / denominator) * 10000) / 10000,
        numerator,
        denominator,
    });
    const inWindow = (row) => row.occurredAt >= options.from && row.occurredAt < options.to;
    const byKey = new Map();
    for (const row of rows)
        byKey.set(row.correlationKey, [...(byKey.get(row.correlationKey) ?? []), row]);
    const groups = new Map();
    for (const row of rows.filter(inWindow)) {
        const key = `${row.source}\u0000${row.phaseMarker}`;
        groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.values()].map((events) => {
        const created = events.filter((e) => e.eventType === 'DRAFT_CREATED');
        const requested = events.filter((e) => e.eventType === 'CLARIFICATION_REQUESTED');
        const direct = created.filter((e) => e.origin === 'DIRECT').length;
        const captureStarts = direct + requested.filter((e) => e.origin === 'DIRECT').length;
        const fieldCounts = {};
        for (const e of requested)
            for (const f of e.fields)
                fieldCounts[f] = (fieldCounts[f] ?? 0) + 1;
        const outcomes = { confirmed: 0, cancelled: 0, expired: 0, abandonedPastTtl: 0, failed: 0, open: 0 };
        const editedByField = {};
        let edited = 0;
        for (const draft of created) {
            const related = byKey.get(draft.correlationKey) ?? [];
            const terminal = related.find((e) => TERMINAL[e.eventType]);
            if (terminal)
                outcomes[TERMINAL[terminal.eventType]] += 1;
            else if (options.now.getTime() - draft.occurredAt.getTime() > financial_draft_1.ASSISTANT_FINANCIAL_DRAFT_TTL_MS)
                outcomes.abandonedPastTtl += 1;
            else
                outcomes.open += 1;
            const edit = related.find((e) => e.eventType === 'DRAFT_EDITED');
            if (edit) {
                edited += 1;
                for (const f of edit.fields)
                    editedByField[f] = (editedByField[f] ?? 0) + 1;
            }
        }
        return {
            source: events[0].source,
            phaseMarker: events[0].phaseMarker,
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
//# sourceMappingURL=captureReport.js.map