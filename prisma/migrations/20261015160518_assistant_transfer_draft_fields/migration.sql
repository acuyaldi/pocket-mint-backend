-- AlterTable
ALTER TABLE "assistant_financial_drafts" ADD COLUMN     "to_wallet_id" TEXT,
ALTER COLUMN "category_id" DROP NOT NULL;
