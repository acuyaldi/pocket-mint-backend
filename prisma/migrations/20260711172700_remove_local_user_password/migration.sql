-- Sprint 1C / S5: remove local password handling.
--
-- The backend never performed first-party password authentication — the column
-- only ever held placeholder strings. Authentication is owned by Supabase Auth.
--
-- DESTRUCTIVE: dropping a column is irreversible; the data in `users.password`
-- is permanently lost when this runs. That data is only placeholder text (no
-- real credential), so there is nothing of value to lose.
--
-- DEPLOY SAFETY: the column is currently NOT NULL with no default, so any
-- application instance still running the OLD code (which INSERTs `password`)
-- will fail once this column is gone. Apply this migration as part of the same
-- deploy that ships the new code, after old instances stop writing the column.
-- For strict zero-downtime, split into two steps: first
--   ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
-- deploy the new code, then run the DROP COLUMN below in a follow-up release.

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password";
