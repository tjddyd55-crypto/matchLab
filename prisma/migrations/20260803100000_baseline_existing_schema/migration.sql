-- Baseline marker for MATCHON schema that was historically applied via
-- `prisma db push` and `prisma/migrations_manual/*` (not Prisma Migrate).
--
-- This migration intentionally contains no schema DDL.
-- Existing Development/Preview databases should be marked applied with:
--   npx prisma migrate resolve --applied 20260803100000_baseline_existing_schema
--
-- Empty databases must be provisioned with the full app schema first
-- (db push / restore), then baseline-resolved, before applying later migrations.

SELECT 1;
