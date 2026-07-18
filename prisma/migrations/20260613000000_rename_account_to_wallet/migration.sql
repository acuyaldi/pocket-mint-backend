-- Rename enum: AccountType -> WalletType
ALTER TYPE "AccountType" RENAME TO "WalletType";

-- Remove old enum values and add LOAN_PAYLATER
ALTER TYPE "WalletType" RENAME TO "WalletType_old";
CREATE TYPE "WalletType" AS ENUM ('CASH', 'BANK', 'E_WALLET', 'CREDIT_CARD', 'LOAN_PAYLATER');

-- Convert existing data: map INVESTMENT/OTHER -> CASH (safe fallback)
ALTER TABLE "accounts" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "accounts" ALTER COLUMN "type" TYPE TEXT;
UPDATE "accounts" SET "type" = 'CASH' WHERE "type" IN ('INVESTMENT', 'OTHER');

ALTER TABLE "accounts" ALTER COLUMN "type" TYPE "WalletType" USING "type"::"WalletType";
ALTER TABLE "accounts" ALTER COLUMN "type" SET DEFAULT 'CASH';
DROP TYPE "WalletType_old";

-- Rename table: accounts -> wallets
ALTER TABLE "accounts" RENAME TO "wallets";

-- Update FK constraint name on wallets (user_id)
ALTER TABLE "wallets" RENAME CONSTRAINT "accounts_user_id_fkey" TO "wallets_user_id_fkey";

-- On transactions: rename account_id -> wallet_id, add to_wallet_id
ALTER TABLE "transactions" RENAME COLUMN "account_id" TO "wallet_id";
ALTER TABLE "transactions" ALTER COLUMN "wallet_id" DROP NOT NULL;
ALTER TABLE "transactions" RENAME CONSTRAINT "transactions_account_id_fkey" TO "transactions_wallet_id_fkey";
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_wallet_id_fkey";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey"
  FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add to_wallet_id column for TRANSFER destination
ALTER TABLE "transactions" ADD COLUMN "to_wallet_id" TEXT;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_wallet_id_fkey"
  FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update indexes
DROP INDEX IF EXISTS "transactions_account_id_idx";
CREATE INDEX "transactions_wallet_id_idx" ON "transactions"("wallet_id");
CREATE INDEX "transactions_to_wallet_id_idx" ON "transactions"("to_wallet_id");
