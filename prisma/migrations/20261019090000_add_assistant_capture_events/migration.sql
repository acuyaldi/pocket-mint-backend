-- Phase 35.1: persisted Assistant capture-quality events (Phase 39 metrics).
-- Additive only: three new enums + one new table, no FK, no change to any
-- existing table. Rollback = leave the table in place (nothing references it).
-- CreateEnum
CREATE TYPE "AssistantCaptureEventType" AS ENUM ('CLARIFICATION_REQUESTED', 'CLARIFICATION_RESOLVED', 'CLARIFICATION_CANCELLED', 'DRAFT_CREATED', 'DRAFT_EDITED', 'DRAFT_CONFIRMED', 'DRAFT_CANCELLED', 'DRAFT_EXPIRED', 'DRAFT_FAILED');

-- CreateEnum
CREATE TYPE "AssistantCaptureField" AS ENUM ('AMOUNT', 'TYPE', 'WALLET', 'SOURCE_WALLET', 'DESTINATION_WALLET', 'MERCHANT', 'CATEGORY', 'DATE', 'DESCRIPTION', 'TRANSACTION_FIELDS', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "AssistantCaptureOrigin" AS ENUM ('DIRECT', 'AFTER_CLARIFICATION');

-- CreateTable
CREATE TABLE "assistant_capture_events" (
    "id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" "AssistantCaptureEventType" NOT NULL,
    "source" "AssistantChannel" NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "phase_marker" TEXT NOT NULL,
    "correlation_key" TEXT NOT NULL,
    "fields" "AssistantCaptureField"[] DEFAULT ARRAY[]::"AssistantCaptureField"[],
    "origin" "AssistantCaptureOrigin",

    CONSTRAINT "assistant_capture_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_capture_events_event_type_occurred_at_idx" ON "assistant_capture_events"("event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "assistant_capture_events_source_occurred_at_idx" ON "assistant_capture_events"("source", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_capture_events_event_type_correlation_key_key" ON "assistant_capture_events"("event_type", "correlation_key");

