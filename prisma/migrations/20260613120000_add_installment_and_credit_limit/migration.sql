-- AlterTable: Add credit_limit to wallets
ALTER TABLE "wallets" ADD COLUMN "credit_limit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: Add installment fields to transactions
ALTER TABLE "transactions" ADD COLUMN "is_installment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "transactions" ADD COLUMN "installment_months" INTEGER;
ALTER TABLE "transactions" ADD COLUMN "current_term" INTEGER NOT NULL DEFAULT 1;
