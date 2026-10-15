-- Provider calls are audited separately from deterministic tool executions.
CREATE TYPE "AssistantProviderExecutionStatus" AS ENUM (
  'STARTED',
  'PLAN_ACCEPTED',
  'CLARIFICATION',
  'UNSUPPORTED',
  'FAILED'
);

ALTER TYPE "AssistantMessageSource" ADD VALUE 'PROVIDER_CLARIFICATION';

CREATE TABLE "assistant_provider_executions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "turn_id" TEXT,
  "correlation_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "status" "AssistantProviderExecutionStatus" NOT NULL DEFAULT 'STARTED',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "input_bytes" INTEGER NOT NULL,
  "output_bytes" INTEGER,
  "finish_classification" TEXT,
  "safe_error_code" TEXT,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "total_tokens" INTEGER,
  "cached_input_tokens" INTEGER,

  CONSTRAINT "assistant_provider_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assistant_provider_executions_correlation_id_key"
  ON "assistant_provider_executions"("correlation_id");
CREATE INDEX "assistant_provider_executions_user_id_started_at_idx"
  ON "assistant_provider_executions"("user_id", "started_at");
CREATE INDEX "assistant_provider_executions_conversation_id_started_at_idx"
  ON "assistant_provider_executions"("conversation_id", "started_at");
CREATE INDEX "assistant_provider_executions_turn_id_started_at_idx"
  ON "assistant_provider_executions"("turn_id", "started_at");

ALTER TABLE "assistant_provider_executions"
  ADD CONSTRAINT "assistant_provider_executions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_provider_executions"
  ADD CONSTRAINT "assistant_provider_executions_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_provider_executions"
  ADD CONSTRAINT "assistant_provider_executions_turn_id_fkey"
  FOREIGN KEY ("turn_id") REFERENCES "assistant_turns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
