import type { AssistantCaptureEventType, AssistantCaptureField, AssistantCaptureOrigin, AssistantChannel, PrismaClient } from '../generated/prisma/client';
export declare const CAPTURE_SCHEMA_VERSION = 1;
/** Bump in the phase that changes capture behavior so the report can split it from the previous baseline (phase-35.1 → phase-38: clarification UX). */
export declare const CAPTURE_PHASE_MARKER = "phase-38";
/** Rows older than this are purged opportunistically (no cron in this repo — same pattern as inboundJob.service.ts). */
export declare const CAPTURE_EVENT_RETENTION_DAYS = 180;
export interface CaptureEvent {
    readonly type: AssistantCaptureEventType;
    /** Existing opaque id (draft / clarification / turn). Hashed before storage, never persisted raw. */
    readonly entityId: string;
    readonly fields?: readonly AssistantCaptureField[];
    readonly origin?: AssistantCaptureOrigin;
}
export type CaptureEventEmitter = (event: CaptureEvent) => Promise<void>;
export declare function runWithCaptureSource<T>(source: AssistantChannel, work: () => Promise<T>): Promise<T>;
/** The exact row persisted for an event — exported so the privacy test checks what is really written. */
export declare function toCaptureEventRow(event: CaptureEvent): {
    eventType: import("@/generated/prisma").$Enums.AssistantCaptureEventType;
    source: import("@/generated/prisma").$Enums.AssistantChannel;
    schemaVersion: number;
    phaseMarker: string;
    correlationKey: string;
    fields: import("@/generated/prisma").$Enums.AssistantCaptureField[];
    origin: import("@/generated/prisma").$Enums.AssistantCaptureOrigin | null;
};
export declare function createCaptureEventEmitter(db: PrismaClient, now?: () => number): CaptureEventEmitter;
/**
 * Maps one application/provider result to its capture events. Only reads
 * bounded status/kind/id fields of the response — never its text or data
 * payload. An error/rejected result emits nothing (a failed continuation
 * rolled its clarification claim back, so nothing was resolved).
 */
export declare function emitForResult(emit: CaptureEventEmitter | undefined, result: {
    readonly response: unknown;
    readonly captureField?: AssistantCaptureField;
}, origin: AssistantCaptureOrigin, resolvedClarificationId?: string): Promise<void>;
