/**
 * Apply ONLY member_sport_template_code_string on Development yamanote.
 * Production forbidden.
 *
 *   npx tsx scripts/_qa-member-grid-phase2-dev-migrate.mts
 */
import { execSync } from "node:child_process";
import pg from "pg";

function railwayDevPgVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function main() {
  const pgVars = railwayDevPgVars();
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
  if (!/yamanote/i.test(dbUrl)) {
    throw new Error("expected Development yamanote");
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  const before = await pool.query(`
    SELECT id, code::text AS code, name,
      (SELECT count(*)::int FROM "MemberSportTemplateField" f WHERE f."templateId" = t.id) AS field_count,
      (SELECT count(*)::int FROM "Gym" g WHERE g."memberSportTemplateId" = t.id) AS gym_count
    FROM "MemberSportTemplate" t
  `);
  console.log("BEFORE", before.rows);

  const pending = await pool.query(`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = '20260903010000_member_sport_template_code_string'
  `);
  if (pending.rowCount && pending.rowCount > 0) {
    console.log("Migration already recorded — skip apply");
  } else {
    // Apply SQL directly (same as migration file) — avoids pulling unrelated pending local migrations
    await pool.query(`
      ALTER TABLE "MemberSportTemplate" ALTER COLUMN "code" TYPE TEXT USING ("code"::text);
      DROP TYPE IF EXISTS "MemberSportTemplateCode";
    `);
    await pool.query(
      `INSERT INTO "_prisma_migrations" (
        id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
      ) VALUES (
        $1, $2, NOW(), $3, NULL, NULL, NOW(), 1
      )`,
      [
        "20260903010000-manual-dev",
        "member_sport_template_code_string",
        "20260903010000_member_sport_template_code_string",
      ],
    );
    console.log("Applied SQL + recorded migration on DEV");
  }

  const afterCol = await pool.query(`
    SELECT data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'MemberSportTemplate' AND column_name = 'code'
  `);
  const enumExists = await pool.query(
    `SELECT 1 FROM pg_type WHERE typname = 'MemberSportTemplateCode'`,
  );
  const after = await pool.query(`
    SELECT id, code, name,
      (SELECT count(*)::int FROM "MemberSportTemplateField" f WHERE f."templateId" = t.id) AS field_count,
      (SELECT count(*)::int FROM "Gym" g WHERE g."memberSportTemplateId" = t.id) AS gym_count
    FROM "MemberSportTemplate" t
  `);
  const unique = await pool.query(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE tablename = 'MemberSportTemplate' AND indexname LIKE '%code%'
  `);

  console.log("AFTER column", afterCol.rows);
  console.log("enumExists", (enumExists.rowCount ?? 0) > 0);
  console.log("AFTER rows", after.rows);
  console.log("unique indexes", unique.rows);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
