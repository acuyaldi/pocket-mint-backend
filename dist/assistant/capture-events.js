"use strict";
// ============================================================
// Assistant capture events (Phase 35.1) — the ONE emitter and taxonomy for
// capture-quality metrics (Phase 39). Called from the service layer
// (application.service.ts, financial-draft.service.ts, provider-runtime.ts),
// so the Web controller and the Telegram worker emit through the same code;
// only the source label differs, set once per Telegram job via
// runWithCaptureSource (anything outside it is WEB, same default as
// AssistantTurn.channel since Phase 30).
//
// Privacy: a row holds closed enums (DB-enforced), two constants, and a
// sha256 of an existing draft/clarification/turn id — never message text,
// amounts, wallet/merchant/category names, aliases, or user/row ids.
//
// Reliability: emission never throws, is always awaited AFTER the financial
// $transaction has committed (never inside it), and is idempotent — a
// retried/recovered call hits the (eventType, correlationKey) unique and
// becomes ON CONFLICT DO NOTHING.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPTURE_EVENT_RETENTION_DAYS = exports.CAPTURE_PHASE_MARKER = exports.CAPTURE_SCHEMA_VERSION = void 0;
exports.runWithCaptureSource = runWithCaptureSource;
exports.toCaptureEventRow = toCaptureEventRow;
exports.createCaptureEventEmitter = createCaptureEventEmitter;
exports.emitForResult = emitForResult;
const node_async_hooks_1 = require("node:async_hooks");
const node_crypto_1 = require("node:crypto");
const logger_1 = require("../utils/logger");
const errorCategory_1 = require("../utils/errorCategory");
exports.CAPTURE_SCHEMA_VERSION = 1;
/** Bump in the phase that changes capture behavior (e.g. Phase 38) so the report can split it from this baseline. */
exports.CAPTURE_PHASE_MARKER = 'phase-35.1';
/** Rows older than this are purged opportunistically (no cron in this repo — same pattern as inboundJob.service.ts). */
exports.CAPTURE_EVENT_RETENTION_DAYS = 180;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
const sourceContext = new node_async_hooks_1.AsyncLocalStorage();
function runWithCaptureSource(source, work) {
    return sourceContext.run(source, work);
}
/** The exact row persisted for an event — exported so the privacy test checks what is really written. */
function toCaptureEventRow(event) {
    return {
        eventType: event.type,
        source: sourceContext.getStore() ?? 'WEB',
        schemaVersion: exports.CAPTURE_SCHEMA_VERSION,
        phaseMarker: exports.CAPTURE_PHASE_MARKER,
        correlationKey: (0, node_crypto_1.createHash)('sha256').update(event.entityId).digest('hex'),
        fields: [...new Set(event.fields ?? [])],
        origin: event.origin ?? null,
    };
}
function createCaptureEventEmitter(db, now = Date.now) {
    let lastPurgeAt = 0;
    return async (event) => {
        try {
            await db.assistantCaptureEvent.createMany({ data: [toCaptureEventRow(event)], skipDuplicates: true });
            if (now() - lastPurgeAt >= PURGE_INTERVAL_MS) {
                lastPurgeAt = now();
                await db.assistantCaptureEvent.deleteMany({
                    where: { occurredAt: { lt: new Date(now() - exports.CAPTURE_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000) } },
                });
            }
        }
        catch (error) {
            (0, logger_1.logEvent)('warn', { event: 'assistant.capture.persist_failed', outcome: event.type, errorCategory: (0, errorCategory_1.categorizeError)(error) });
        }
    };
}
/**
 * Maps one application/provider result to its capture events. Only reads
 * bounded status/kind/id fields of the response — never its text or data
 * payload. An error/rejected result emits nothing (a failed continuation
 * rolled its clarification claim back, so nothing was resolved).
 */
async function emitForResult(emit, result, origin, resolvedClarificationId) {
    if (!emit)
        return;
    const response = result.response;
    if (response.status !== 'success' && response.status !== 'clarification_required')
        return;
    if (resolvedClarificationId)
        await emit({ type: 'CLARIFICATION_RESOLVED', entityId: resolvedClarificationId });
    if (response.status === 'success' && response.data?.confirmationRequired === true && typeof response.data.draftId === 'string') {
        await emit({ type: 'DRAFT_CREATED', entityId: response.data.draftId, origin });
        return;
    }
    if (response.status !== 'clarification_required')
        return;
    const clarificationId = response.data?.clarification?.clarificationId;
    const entityId = typeof clarificationId === 'string' ? clarificationId : response.turnId;
    if (entityId)
        await emit({ type: 'CLARIFICATION_REQUESTED', entityId, fields: [result.captureField ?? 'UNSPECIFIED'], origin });
}
//# sourceMappingURL=capture-events.js.map