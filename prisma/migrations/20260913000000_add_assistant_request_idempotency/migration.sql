CREATE TYPE "AssistantIdempotencyStatus" AS ENUM ('RUNNING', 'COMPLETED');

ALTER TABLE "assistant_idempotency_records" ALTER COLUMN "draft_id" DROP NOT NULL;
ALTER TABLE "assistant_idempotency_records" ADD COLUMN "turn_id" TEXT;
ALTER TABLE "assistant_idempotency_records" ADD COLUMN "status" "AssistantIdempotencyStatus" NOT NULL DEFAULT 'COMPLETED';
ALTER TABLE "assistant_idempotency_records" ADD COLUMN "response_status" INTEGER;
ALTER TABLE "assistant_idempotency_records" ADD COLUMN "response_body" JSONB;
ALTER TABLE "assistant_idempotency_records" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "assistant_idempotency_records_turn_id_idx" ON "assistant_idempotency_records"("turn_id");

ALTER TABLE "assistant_idempotency_records" ADD CONSTRAINT "assistant_idempotency_records_turn_id_fkey" FOREIGN KEY ("turn_id") REFERENCES "assistant_turns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
