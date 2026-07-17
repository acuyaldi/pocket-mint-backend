-- ============================================================================
-- PM-STAB-009A: Retire unused Transfer model
-- ============================================================================
-- The Transfer model in the Prisma schema was never used by any service,
-- controller, route, or test. All transfers use Transaction rows with
-- type='TRANSFER', walletId (source), and toWalletId (destination).
--
-- Decision A: Dead model, safe to remove.
-- Evidence: Zero prisma.transfer references in src/ or test/. Product
-- Decision PD-007 declares Transaction-with-toWalletId canonical.
-- Prior audits: F4 (MVP Stability), PM-TRF-002 (Reconciliation),
-- BE-DB-003 (Backend).
--
-- SAFE / NON-DESTRUCTIVE: no application code ever writes to the transfers
-- table. Foreign keys are dropped first, then the table itself.
-- ============================================================================

-- Drop foreign keys first (the table may have zero rows, but the FKs exist)
ALTER TABLE IF EXISTS "transfers" DROP CONSTRAINT IF EXISTS "transfers_user_id_fkey";
ALTER TABLE IF EXISTS "transfers" DROP CONSTRAINT IF EXISTS "transfers_from_wallet_id_fkey";
ALTER TABLE IF EXISTS "transfers" DROP CONSTRAINT IF EXISTS "transfers_to_wallet_id_fkey";

-- Drop the table
DROP TABLE IF EXISTS "transfers";
