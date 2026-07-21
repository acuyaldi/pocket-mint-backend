-- CreateEnum
CREATE TYPE "RecurringAmountMode" AS ENUM ('FIXED', 'FLEXIBLE');

-- AlterTable
ALTER TABLE "recurring_transaction_templates" ADD COLUMN     "amount_mode" "RecurringAmountMode" NOT NULL DEFAULT 'FIXED',
ALTER COLUMN "amount" DROP NOT NULL;
