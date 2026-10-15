CREATE TYPE "AssistantFinancialDraftStatus" AS ENUM ('PENDING_CONFIRMATION', 'COMMITTED', 'CANCELLED', 'EXPIRED', 'FAILED');

CREATE TABLE "assistant_financial_drafts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "originating_turn_id" TEXT NOT NULL,
  "originating_execution_id" TEXT NOT NULL,
  "status" "AssistantFinancialDraftStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  "operation" TEXT NOT NULL,
  "transaction_type" "TransactionType" NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "wallet_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "transaction_date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "committed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "transaction_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assistant_financial_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assistant_idempotency_records" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "draft_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "transaction_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assistant_idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assistant_financial_drafts_originating_execution_id_key" ON "assistant_financial_drafts"("originating_execution_id");
CREATE UNIQUE INDEX "assistant_financial_drafts_transaction_id_key" ON "assistant_financial_drafts"("transaction_id");
CREATE INDEX "assistant_financial_drafts_user_id_status_expires_at_idx" ON "assistant_financial_drafts"("user_id", "status", "expires_at");
CREATE INDEX "assistant_financial_drafts_conversation_id_created_at_idx" ON "assistant_financial_drafts"("conversation_id", "created_at");
CREATE UNIQUE INDEX "assistant_idempotency_records_user_id_key_key" ON "assistant_idempotency_records"("user_id", "key");
CREATE INDEX "assistant_idempotency_records_draft_id_idx" ON "assistant_idempotency_records"("draft_id");

ALTER TABLE "assistant_financial_drafts" ADD CONSTRAINT "assistant_financial_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_financial_drafts" ADD CONSTRAINT "assistant_financial_drafts_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_financial_drafts" ADD CONSTRAINT "assistant_financial_drafts_originating_turn_id_fkey" FOREIGN KEY ("originating_turn_id") REFERENCES "assistant_turns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_financial_drafts" ADD CONSTRAINT "assistant_financial_drafts_originating_execution_id_fkey" FOREIGN KEY ("originating_execution_id") REFERENCES "assistant_tool_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_financial_drafts" ADD CONSTRAINT "assistant_financial_drafts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assistant_idempotency_records" ADD CONSTRAINT "assistant_idempotency_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_idempotency_records" ADD CONSTRAINT "assistant_idempotency_records_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "assistant_financial_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assistant_idempotency_records" ADD CONSTRAINT "assistant_idempotency_records_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
