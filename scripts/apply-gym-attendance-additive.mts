/**
 * Apply additive Gym attendance SQL statement-by-statement.
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
  "scripts/sql/add-gym-attendance-additive.sql";

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
        .replace(/^(?:\s*--[^\n]*\n)+/, "")
        .trim(),
    )
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}

const FK_STATEMENTS = [
  `ALTER TABLE "GymAttendanceKiosk" ADD CONSTRAINT "GymAttendanceKiosk_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberAttendance" ADD CONSTRAINT "GymMemberAttendance_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberAttendance" ADD CONSTRAINT "GymMemberAttendance_gymMemberId_fkey" FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "GymMemberAttendance" ADD CONSTRAINT "GymMemberAttendance_kioskSessionId_fkey" FOREIGN KEY ("kioskSessionId") REFERENCES "GymAttendanceKiosk"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
];

async function execIgnoreDup(client: import("pg").PoolClient, sql: string) {
  try {
    await client.query(sql);
    return "ok";
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (
      err.code === "42710" ||
      err.code === "42P07" ||
      err.code === "42701" ||
      err.code === "23505" ||
      /already exists/i.test(err.message ?? "")
    ) {
      return "skip";
    }
    throw e;
  }
}

function wrapCreateType(stmt: string): string {
  const m = stmt.match(
    /^CREATE\s+TYPE\s+"([^"]+)"\s+AS\s+ENUM\s*\(([\s\S]*)\)\s*;?\s*$/i,
  );
  if (!m) return stmt;
  const name = m[1];
  const values = m[2];
  return `
DO $gym_attendance_enum$
BEGIN
  CREATE TYPE "${name}" AS ENUM (${values});
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$gym_attendance_enum$;`;
}

async function main() {
  const raw = readFileSync(sqlPath, "utf8");
  const statements = splitStatements(raw);
  const client = await pool.connect();
  try {
    for (const stmt of statements) {
      const sql = stmt.startsWith("CREATE TYPE") ? wrapCreateType(stmt) : stmt;
      const result = await execIgnoreDup(client, sql.endsWith(";") ? sql : `${sql};`);
      console.log(`${result}: ${stmt.slice(0, 72).replace(/\s+/g, " ")}…`);
    }
    for (const fk of FK_STATEMENTS) {
      const result = await execIgnoreDup(client, fk);
      console.log(`${result}: FK ${fk.slice(0, 60)}…`);
    }
    console.log("OK: gym attendance additive schema applied");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
