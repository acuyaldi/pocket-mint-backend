-- Rename the ambiguous combined type while preserving every existing row.
ALTER TYPE "WalletType" RENAME VALUE 'LOAN_PAYLATER' TO 'PAYLATER';
ALTER TYPE "WalletType" ADD VALUE 'LOAN';

-- Credit billing-cycle metadata is optional because users may supply a first
-- due date per transaction when either value is not configured.
ALTER TABLE "wallets"
  ADD COLUMN "cutoff_day" INTEGER,
  ADD COLUMN "payment_due_day" INTEGER;

ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_cutoff_day_check"
    CHECK ("cutoff_day" IS NULL OR "cutoff_day" BETWEEN 1 AND 31),
  ADD CONSTRAINT "wallets_payment_due_day_check"
    CHECK ("payment_due_day" IS NULL OR "payment_due_day" BETWEEN 1 AND 31);

CREATE TYPE "BillKind" AS ENUM ('FULL', 'INSTALLMENT');

ALTER TABLE "installments"
  ADD COLUMN "kind" "BillKind" NOT NULL DEFAULT 'INSTALLMENT',
  ADD COLUMN "paid_terms" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "next_due_date" TIMESTAMP(3);

-- Legacy current_term is one-based (1 means no term has been paid yet).
UPDATE "installments"
SET
  "paid_terms" = GREATEST("current_term" - 1, 0),
  "next_due_date" = "start_date"
    + (GREATEST("current_term" - 1, 0)::text || ' months')::interval;

ALTER TABLE "installments"
  ALTER COLUMN "next_due_date" SET NOT NULL,
  ADD CONSTRAINT "installments_term_count_check"
    CHECK ("installment_months" > 0),
  ADD CONSTRAINT "installments_paid_terms_check"
    CHECK ("paid_terms" >= 0 AND "paid_terms" <= "installment_months");
