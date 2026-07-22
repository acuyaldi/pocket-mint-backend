CREATE TYPE "AssistantConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'EXPIRED');
CREATE TYPE "AssistantTurnStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'REJECTED', 'CLARIFICATION_REQUIRED');
CREATE TYPE "AssistantMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "AssistantMessageSource" AS ENUM ('USER_PROVIDED', 'CANONICAL_FALLBACK', 'SAFE_REQUEST_SUMMARY', 'DETERMINISTIC_RENDERER', 'SAFE_ERROR');
CREATE TYPE "AssistantToolExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'DENIED');

CREATE TABLE "assistant_conversations" (
  "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "status" "AssistantConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "locale" TEXT NOT NULL DEFAULT 'id-ID', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMP(3), CONSTRAINT "assistant_conversations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "assistant_turns" (
  "id" TEXT NOT NULL, "conversation_id" TEXT NOT NULL, "correlation_id" TEXT NOT NULL,
  "status" "AssistantTurnStatus" NOT NULL DEFAULT 'PENDING', "intent" TEXT NOT NULL, "locale" TEXT NOT NULL,
  "safe_error_code" TEXT, "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "assistant_turns_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "assistant_messages" (
  "id" TEXT NOT NULL, "conversation_id" TEXT NOT NULL, "turn_id" TEXT NOT NULL,
  "role" "AssistantMessageRole" NOT NULL, "source" "AssistantMessageSource" NOT NULL,
  "content" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "assistant_tool_executions" (
  "id" TEXT NOT NULL, "conversation_id" TEXT NOT NULL, "turn_id" TEXT NOT NULL,
  "tool_id" TEXT NOT NULL, "capability" TEXT NOT NULL, "risk_level" TEXT NOT NULL,
  "policy_decision" TEXT NOT NULL, "status" "AssistantToolExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "correlation_id" TEXT NOT NULL, "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3), "duration_ms" INTEGER, "safe_error_code" TEXT,
  "redacted_input" JSONB, "output_summary" JSONB, "idempotency_key" TEXT,
  CONSTRAINT "assistant_tool_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assistant_conversations_user_id_last_activity_at_id_idx" ON "assistant_conversations"("user_id", "last_activity_at", "id");
CREATE INDEX "assistant_conversations_user_id_status_last_activity_at_idx" ON "assistant_conversations"("user_id", "status", "last_activity_at");
CREATE UNIQUE INDEX "assistant_turns_correlation_id_key" ON "assistant_turns"("correlation_id");
CREATE INDEX "assistant_turns_conversation_id_created_at_id_idx" ON "assistant_turns"("conversation_id", "created_at", "id");
CREATE INDEX "assistant_turns_status_started_at_idx" ON "assistant_turns"("status", "started_at");
CREATE INDEX "assistant_messages_conversation_id_created_at_id_idx" ON "assistant_messages"("conversation_id", "created_at", "id");
CREATE INDEX "assistant_messages_turn_id_idx" ON "assistant_messages"("turn_id");
CREATE INDEX "assistant_tool_executions_turn_id_started_at_idx" ON "assistant_tool_executions"("turn_id", "started_at");
CREATE INDEX "assistant_tool_executions_conversation_id_started_at_idx" ON "assistant_tool_executions"("conversation_id", "started_at");
CREATE INDEX "assistant_tool_executions_correlation_id_idx" ON "assistant_tool_executions"("correlation_id");

ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_turns" ADD CONSTRAINT "assistant_turns_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_turn_id_fkey" FOREIGN KEY ("turn_id") REFERENCES "assistant_turns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_tool_executions" ADD CONSTRAINT "assistant_tool_executions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_tool_executions" ADD CONSTRAINT "assistant_tool_executions_turn_id_fkey" FOREIGN KEY ("turn_id") REFERENCES "assistant_turns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
