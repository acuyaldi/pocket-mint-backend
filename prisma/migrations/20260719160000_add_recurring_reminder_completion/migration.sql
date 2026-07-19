-- AlterTable
ALTER TABLE "recurring_reminder_events" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "generated_transaction_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "recurring_reminder_events_generated_transaction_id_key" ON "recurring_reminder_events"("generated_transaction_id");

-- AddForeignKey
ALTER TABLE "recurring_reminder_events" ADD CONSTRAINT "recurring_reminder_events_generated_transaction_id_fkey" FOREIGN KEY ("generated_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
