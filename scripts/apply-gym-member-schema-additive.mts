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
    .map((s) => s.trim())
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

async function main() {
  const raw = readFileSync(sqlPath, "utf8");
  const statements = [...splitStatements(raw), ...FK_STATEMENTS];
  const client = await pool.connect();
  let ok = 0;
  let skip = 0;
  try {
    for (const stmt of statements) {
      const r = await execIgnoreDup(client, stmt.endsWith(";") ? stmt : `${stmt};`);
      if (r === "ok") ok += 1;
      else skip += 1;
    }
    const check = await client.query(`
      SELECT
        to_regclass('"GymMember"') IS NOT NULL AS has_gym_member,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'Fighter' AND column_name = 'gymMemberId'
        ) AS has_fighter_col,
        (SELECT COUNT(*)::int FROM "GymApplication") AS gym_application_kept
    `);
    console.log(
      "ADDITIVE_SCHEMA_OK",
      JSON.stringify({ ok, skip, ...check.rows[0] }),
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
