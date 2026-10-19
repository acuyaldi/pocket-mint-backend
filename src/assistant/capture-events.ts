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

import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import type {
  AssistantCaptureEventType,
  AssistantCaptureField,
  AssistantCaptureOrigin,
  AssistantChannel,
  PrismaClient,
} from '../generated/prisma/client';
import { logEvent } from '../utils/logger';
import { categorizeError } from '../utils/errorCategory';

export const CAPTURE_SCHEMA_VERSION = 1;
/** Bump in the phase that changes capture behavior so the report can split it from the previous baseline (phase-35.1 → phase-38: clarification UX). */
export const CAPTURE_PHASE_MARKER = 'phase-38';
/** Rows older than this are purged opportunistically (no cron in this repo — same pattern as inboundJob.service.ts). */
export const CAPTURE_EVENT_RETENTION_DAYS = 180;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

export interface CaptureEvent {
  readonly type: AssistantCaptureEventType;
  /** Existing opaque id (draft / clarification / turn). Hashed before storage, never persisted raw. */
  readonly entityId: string;
  readonly fields?: readonly AssistantCaptureField[];
  readonly origin?: AssistantCaptureOrigin;
}

export type CaptureEventEmitter = (event: CaptureEvent) => Promise<void>;

const sourceContext = new AsyncLocalStorage<AssistantChannel>();

export function runWithCaptureSource<T>(source: AssistantChannel, work: () => Promise<T>): Promise<T> {
  return sourceContext.run(source, work);
}

/** The exact row persisted for an event — exported so the privacy test checks what is really written. */
export function toCaptureEventRow(event: CaptureEvent) {
  return {
    eventType: event.type,
    source: sourceContext.getStore() ?? 'WEB',
    schemaVersion: CAPTURE_SCHEMA_VERSION,
    phaseMarker: CAPTURE_PHASE_MARKER,
    correlationKey: createHash('sha256').update(event.entityId).digest('hex'),
    fields: [...new Set(event.fields ?? [])],
    origin: event.origin ?? null,
  };
}

export function createCaptureEventEmitter(db: PrismaClient, now: () => number = Date.now): CaptureEventEmitter {
  let lastPurgeAt = 0;
  return async (event) => {
    try {
      await db.assistantCaptureEvent.createMany({ data: [toCaptureEventRow(event)], skipDuplicates: true });
      if (now() - lastPurgeAt >= PURGE_INTERVAL_MS) {
        lastPurgeAt = now();
        await db.assistantCaptureEvent.deleteMany({
          where: { occurredAt: { lt: new Date(now() - CAPTURE_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000) } },
        });
      }
    } catch (error) {
      logEvent('warn', { event: 'assistant.capture.persist_failed', outcome: event.type, errorCategory: categorizeError(error) });
    }
  };
}

/**
 * Maps one application/provider result to its capture events. Only reads
 * bounded status/kind/id fields of the response — never its text or data
 * payload. An error/rejected result emits nothing (a failed continuation
 * rolled its clarification claim back, so nothing was resolved).
 */
export async function emitForResult(
  emit: CaptureEventEmitter | undefined,
  result: { readonly response: unknown; readonly captureField?: AssistantCaptureField },
  origin: AssistantCaptureOrigin,
  resolvedClarificationId?: string,
): Promise<void> {
  if (!emit) return;
  const response = result.response as {
    status?: string;
    turnId?: string;
    data?: { draftId?: unknown; confirmationRequired?: unknown; clarification?: { clarificationId?: unknown } };
  };
  if (response.status !== 'success' && response.status !== 'clarification_required') return;
  if (resolvedClarificationId) await emit({ type: 'CLARIFICATION_RESOLVED', entityId: resolvedClarificationId });
  if (response.status === 'success' && response.data?.confirmationRequired === true && typeof response.data.draftId === 'string') {
    await emit({ type: 'DRAFT_CREATED', entityId: response.data.draftId, origin });
    return;
  }
  if (response.status !== 'clarification_required') return;
  const clarificationId = response.data?.clarification?.clarificationId;
  const entityId = typeof clarificationId === 'string' ? clarificationId : response.turnId;
  if (entityId) await emit({ type: 'CLARIFICATION_REQUESTED', entityId, fields: [result.captureField ?? 'UNSPECIFIED'], origin });
}
