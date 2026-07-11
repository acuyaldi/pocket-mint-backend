-- Sprint 2A / financial integrity: persist a transfer's destination wallet.
--
-- Previously a TRANSFER was stored as a single Transaction referencing only the
-- SOURCE wallet (`wallet_id`); the destination was credited by a direct balance
-- update with no persisted link. That made a transfer impossible to reverse from
-- its own row, so update/delete drifted both wallets (audit C1).
--
-- SAFE / NON-DESTRUCTIVE: `to_wallet_id` is nullable with no default and no data
-- change. Old application code simply ignores the column, so this migration can
-- be applied BEFORE the new code ships (backward compatible, no ordering
-- requirement, no data loss). The FK is ON DELETE SET NULL.
--
-- NOTE ON EXISTING DATA: transfer rows created before this migration keep
-- `to_wallet_id = NULL`. The new code refuses to update/delete such legacy
-- transfers (they cannot be reversed symmetrically) and reports them via the
-- read-only reconciliation script instead of silently corrupting balances.

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "to_wallet_id" TEXT;

-- CreateIndex
CREATE INDEX "transactions_to_wallet_id_idx" ON "transactions"("to_wallet_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
