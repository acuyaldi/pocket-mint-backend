-- AlterTable
ALTER TABLE "recurring_reminder_events" ADD COLUMN     "installment_id" TEXT,
ALTER COLUMN "template_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "recurring_reminder_events_installment_id_occurrence_date_of_key" ON "recurring_reminder_events"("installment_id", "occurrence_date", "offset_days");

-- AddForeignKey
ALTER TABLE "recurring_reminder_events" ADD CONSTRAINT "recurring_reminder_events_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

