/**
 * Apply additive MATCHON messaging SQL statement-by-statement.
 * Ignores already-exists errors. Never drops tables. Never prints DATABASE_URL.
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
  "scripts/sql/add-matchon-messaging-schema-additive.sql";

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

function wrapCreateType(stmt: string): string {
  const m = stmt.match(
    /^CREATE\s+TYPE\s+"([^"]+)"\s+AS\s+ENUM\s*\(([\s\S]*)\)\s*;?\s*$/i,
  );
  if (!m) return stmt;
  return `
DO $matchon_msg_enum$
BEGIN
  CREATE TYPE "${m[1]}" AS ENUM (${m[2]});
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$matchon_msg_enum$;`;
}

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
      /already exists/i.test(err.message ?? "")
    ) {
      return "skip";
    }
    throw e;
  }
}

const FK = [
  `ALTER TABLE "MatchonMessageTemplate" ADD CONSTRAINT "MatchonMessageTemplate_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "MatchonMessageDispatch" ADD CONSTRAINT "MatchonMessageDispatch_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "MatchonMessageDispatch" ADD CONSTRAINT "MatchonMessageDispatch_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MatchonMessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "MatchonMessageRecipient" ADD CONSTRAINT "MatchonMessageRecipient_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "MatchonMessageDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "MatchonMessageRecipient" ADD CONSTRAINT "MatchonMessageRecipient_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
];

async function main() {
  const raw = readFileSync(sqlPath, "utf8").replace(/^\uFEFF/, "");
  const statements = [...splitStatements(raw), ...FK];
  const client = await pool.connect();
  let ok = 0;
  let skip = 0;
  try {
    for (const rawStmt of statements) {
      let stmt = rawStmt.endsWith(";") ? rawStmt : `${rawStmt};`;
      if (/^CREATE\s+TYPE\s+/i.test(stmt.trim())) stmt = wrapCreateType(stmt);
      const r = await execIgnoreDup(client, stmt);
      if (r === "ok") ok += 1;
      else skip += 1;
    }
    const check = await client.query(`
      SELECT
        to_regclass('"MatchonMessageTemplate"') IS NOT NULL AS has_template,
        to_regclass('"MatchonMessageDispatch"') IS NOT NULL AS has_dispatch,
        to_regclass('"MatchonMessageRecipient"') IS NOT NULL AS has_recipient,
        to_regtype('"MatchonMessageChannel"') IS NOT NULL AS has_channel_enum
    `);
    const row = check.rows[0];
    if (!row.has_template || !row.has_dispatch || !row.has_recipient) {
      console.error("ADDITIVE_MESSAGING_SCHEMA_FAIL", JSON.stringify(row));
      process.exit(1);
    }
    console.log("ADDITIVE_MESSAGING_SCHEMA_OK", JSON.stringify({ ok, skip, ...row }));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("ADDITIVE_MESSAGING_SCHEMA_FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
