-- ============================================================================
-- RECONSTRUCTED BASELINE MIGRATION
-- ============================================================================
-- Purpose: make fresh-database provisioning possible again.
--
-- The remote database was originally provisioned by migrations whose directories
-- were never committed locally:
--     20260612031023_init
--     20260613000000_rename_account_to_wallet   (account -> wallet rename)
-- Because those directories are absent from prisma/migrations, the local history
-- began at 20260711172700_remove_local_user_password, which ALTERs tables that no
-- longer get created on an empty database. `prisma migrate status` reported
-- "last common migration: null" and a fresh database could not be provisioned.
--
-- This baseline reconstructs the exact schema state that the remote database is
-- in RIGHT NOW: the net result of _init + _rename_account_to_wallet, i.e. the
-- state immediately BEFORE the two committed local migrations:
--     20260711172700_remove_local_user_password  (drops users.password)
--     20260711223000_add_transaction_to_wallet    (adds transactions.to_wallet_id)
--
-- Equivalence was proven read-only against the LIVE database with:
--     prisma migrate diff --from-config-datasource prisma.config.ts \
--                         --to-schema prisma/schema.prisma --script
-- which emitted ONLY: users DROP password; transactions ADD to_wallet_id (+idx+fk).
-- Therefore this baseline (= current schema WITH users.password and WITHOUT
-- transactions.to_wallet_id) is byte-for-relation equivalent to the remote head.
--
-- Deliberate differences from the current prisma/schema.prisma (do NOT "fix"):
--   * users.password is PRESENT here (NOT NULL, no default). The next migration
--     drops it. Removing it here would break that migration on a fresh database.
--   * transactions.to_wallet_id + its index + its FK are ABSENT here. The
--     following migration adds them. Adding them here would break that migration.
--
-- Safety: only CREATE statements on a fresh/empty database. No data statements,
-- no secrets, no environment-dependent SQL. NEVER apply this to a database that
-- already contains the baseline tables (the existing remote already has them) —
-- reconcile that database with `prisma migrate resolve --applied` instead. See
-- docs/prisma-migration-reconciliation.md.
-- ============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('CASH', 'BANK', 'E_WALLET', 'CREDIT_CARD', 'LOAN_PAYLATER');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "AdminFeeType" AS ENUM ('FLAT', 'PERCENT');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('ACTIVE', 'SETTLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WalletType" NOT NULL DEFAULT 'CASH',
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "initial_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "icon" TEXT,
    "color" TEXT,
    "interest_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "admin_fee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "admin_fee_type" "AdminFeeType" NOT NULL DEFAULT 'FLAT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "category_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "is_installment" BOOLEAN NOT NULL DEFAULT false,
    "installment_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "interest_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_interest" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "admin_fee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "admin_fee_type" "AdminFeeType" NOT NULL DEFAULT 'FLAT',
    "total_admin_fee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "installment_months" INTEGER NOT NULL,
    "current_term" INTEGER NOT NULL DEFAULT 1,
    "monthly_amount" DECIMAL(15,2) NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "balance_deducted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_wallet_id" TEXT NOT NULL,
    "to_wallet_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "categories_user_id_type_idx" ON "categories"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_name_type_key" ON "categories"("user_id", "name", "type");

-- CreateIndex
CREATE INDEX "transactions_user_id_date_idx" ON "transactions"("user_id", "date");

-- CreateIndex
CREATE INDEX "transactions_user_id_type_idx" ON "transactions"("user_id", "type");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_date_idx" ON "transactions"("wallet_id", "date");

-- CreateIndex
CREATE INDEX "transactions_category_id_idx" ON "transactions"("category_id");

-- CreateIndex
CREATE INDEX "transactions_installment_id_idx" ON "transactions"("installment_id");

-- CreateIndex
CREATE INDEX "installments_user_id_status_idx" ON "installments"("user_id", "status");

-- CreateIndex
CREATE INDEX "installments_wallet_id_idx" ON "installments"("wallet_id");

-- CreateIndex
CREATE INDEX "transfers_user_id_date_idx" ON "transfers"("user_id", "date");

-- CreateIndex
CREATE INDEX "transfers_from_wallet_id_idx" ON "transfers"("from_wallet_id");

-- CreateIndex
CREATE INDEX "transfers_to_wallet_id_idx" ON "transfers"("to_wallet_id");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_wallet_id_fkey" FOREIGN KEY ("from_wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
