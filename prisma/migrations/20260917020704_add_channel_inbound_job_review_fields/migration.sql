-- AlterTable
-- Phase 29 (PD-019): operator review bookkeeping for ambiguous ChannelInboundJob
-- rows. Additive only — no existing worker/processing code reads or writes
-- these columns.
ALTER TABLE "channel_inbound_jobs" ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT;
