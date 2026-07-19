-- AlterTable
ALTER TABLE "recurring_transaction_templates" ADD COLUMN     "reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder_offset_days" INTEGER;
