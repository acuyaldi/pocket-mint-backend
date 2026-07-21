-- CreateTable
CREATE TABLE "recurring_reminder_events" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "occurrence_date" TIMESTAMP(3) NOT NULL,
    "offset_days" INTEGER NOT NULL,
    "reminder_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_reminder_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_reminder_events_template_id_occurrence_date_offse_key" ON "recurring_reminder_events"("template_id", "occurrence_date", "offset_days");

-- CreateIndex
CREATE INDEX "recurring_reminder_events_user_id_reminder_date_idx" ON "recurring_reminder_events"("user_id", "reminder_date");

-- AddForeignKey
ALTER TABLE "recurring_reminder_events" ADD CONSTRAINT "recurring_reminder_events_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "recurring_transaction_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
