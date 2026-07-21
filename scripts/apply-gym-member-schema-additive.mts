/**
 * Apply additive GymMember SQL statement-by-statement.
 * Ignores duplicate_object / already-exists errors.
 * Never prints DATABASE_URL. Never drops tables.
 */
import { readFileSync } from "node:fs";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) {
  console.error("FAIL: DATABASE_URL required");
  process.exit(1);
}

const sqlPath =
  process.env.SQL_PATH?.trim() ||
  "scripts/sql/add-gym-member-schema-additive.sql";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "0"
      ? undefined
      : { rejectUnauthorized: false },
});

function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((s) =>
      s
        // drop leading SQL line comments so the first CREATE TYPE is not discarded
        .replace(/^(?:\s*--[^\n]*\n)+/, "")
        .trim(),
    )
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}

const FK_STATEMENTS = [
  `ALTER TABLE "Fighter" ADD CONSTRAINT "Fighter_gymMemberId_fkey" FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "GymMember" ADD CONSTRAINT "GymMember_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMembershipPlan" ADD CONSTRAINT "GymMembershipPlan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberSubscription" ADD CONSTRAINT "GymMemberSubscription_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberSubscription" ADD CONSTRAINT "GymMemberSubscription_gymMemberId_fkey" FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberSubscription" ADD CONSTRAINT "GymMemberSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GymMembershipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberSubscriptionPause" ADD CONSTRAINT "GymMemberSubscriptionPause_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "GymMemberSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberPayment" ADD CONSTRAINT "GymMemberPayment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberPayment" ADD CONSTRAINT "GymMemberPayment_gymMemberId_fkey" FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberPayment" ADD CONSTRAINT "GymMemberPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "GymMemberSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
];

async function execIgnoreDup(client: import("pg").PoolClient, sql: string) {
  try {
    await client.query(sql);
    return "ok";
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (
      err.code === "42710" || // duplicate_object
      err.code === "42P07" || // duplicate_table
      err.code === "42701" || // duplicate_column
      err.code === "23505" || // unique_violation on concurrent
      /already exists/i.test(err.message ?? "")
    ) {
      return "skip";
    }
    throw e;
  }
}

/** Postgres cannot CREATE TYPE IF NOT EXISTS on older versions — wrap safely. */
function wrapCreateType(stmt: string): string {
  const m = stmt.match(
    /^CREATE\s+TYPE\s+"([^"]+)"\s+AS\s+ENUM\s*\(([\s\S]*)\)\s*;?\s*$/i,
  );
  if (!m) return stmt;
  const name = m[1];
  const values = m[2];
  return `
DO $gym_member_enum$
BEGIN
  CREATE TYPE "${name}" AS ENUM (${values});
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$gym_member_enum$;`;
}

async function main() {
  const raw = readFileSync(sqlPath, "utf8").replace(/^\uFEFF/, "");
  const statements = [...splitStatements(raw), ...FK_STATEMENTS];
  const client = await pool.connect();
  let ok = 0;
  let skip = 0;
  const failures: Array<{ preview: string; message: string }> = [];
  try {
    for (const rawStmt of statements) {
      let stmt = rawStmt.endsWith(";") ? rawStmt : `${rawStmt};`;
      if (/^CREATE\s+TYPE\s+/i.test(stmt.trim())) {
        stmt = wrapCreateType(stmt);
      }
      try {
        const r = await execIgnoreDup(client, stmt);
        if (r === "ok") ok += 1;
        else skip += 1;
      } catch (e: unknown) {
        const err = e as { message?: string };
        failures.push({
          preview: stmt.replace(/\s+/g, " ").slice(0, 120),
          message: err.message ?? String(e),
        });
        // continue remaining additive statements when possible
      }
    }
    if (failures.length > 0) {
      console.error(
        "ADDITIVE_SCHEMA_PARTIAL_FAIL",
        JSON.stringify(failures.slice(0, 10), null, 2),
      );
      process.exitCode = 1;
    }
    const check = await client.query(`
      SELECT
        to_regclass('"GymMember"') IS NOT NULL AS has_gym_member,
        to_regtype('"GymMemberStatus"') IS NOT NULL AS has_status_enum,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'Fighter'
            AND column_name = 'gymMemberId'
        ) AS has_fighter_col,
        to_regclass('"GymApplication"') IS NOT NULL AS has_gym_application
    `);
    const row = check.rows[0] as {
      has_gym_member: boolean;
      has_status_enum: boolean;
      has_fighter_col: boolean;
      has_gym_application: boolean;
    };
    let gymApplicationKept: number | null = null;
    if (row.has_gym_application) {
      const ga = await client.query(
        `SELECT COUNT(*)::int AS n FROM "GymApplication"`,
      );
      gymApplicationKept = Number(ga.rows[0].n);
    }
    if (!row.has_gym_member || !row.has_fighter_col || !row.has_status_enum) {
      console.error(
        "ADDITIVE_SCHEMA_FAIL",
        JSON.stringify({ ok, skip, ...row, gymApplicationKept }),
      );
      process.exit(1);
    }
    console.log(
      "ADDITIVE_SCHEMA_OK",
      JSON.stringify({
        ok,
        skip,
        failures: failures.length,
        ...row,
        gym_application_kept: gymApplicationKept,
      }),
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("ADDITIVE_SCHEMA_FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
