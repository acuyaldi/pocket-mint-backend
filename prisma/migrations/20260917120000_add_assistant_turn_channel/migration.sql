-- CreateEnum
CREATE TYPE "AssistantChannel" AS ENUM ('WEB', 'TELEGRAM');

-- AlterTable
-- Phase 30 (channel/source attribution): which surface produced this turn.
-- Existing rows and any turn created without explicit knowledge of the
-- channel default to WEB. The channel inbound worker stamps a turn TELEGRAM
-- after the fact, once the turn id is known, for both message- and
-- callback-originated turns.
ALTER TABLE "assistant_turns" ADD COLUMN     "channel" "AssistantChannel" NOT NULL DEFAULT 'WEB';

-- Best-effort backfill: retag any turn already linked to a still-live
-- Telegram ChannelInboundJob (row not yet retention-purged, see
-- src/channels/retention.ts). Turns produced by a callback (button press)
-- were never linked via assistant_turn_id before this phase, and any turn
-- whose inbound job has already been purged keeps the WEB default — a
-- known, bounded, one-time gap documented in
-- docs/product/decisions/030-channel-source-attribution.md.
UPDATE "assistant_turns" t
SET "channel" = 'TELEGRAM'
FROM "channel_inbound_jobs" j
WHERE j."assistant_turn_id" = t.id
  AND j."provider" = 'TELEGRAM';
