/**
 * Apply additive PublicPartner SQL statement-by-statement.
 * Ignores already-exists errors. Never drops. Never prints DATABASE_URL.
 * Never backfills Organizer logos.
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
  "scripts/sql/add-public-partner-schema-additive.sql";

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

async function main() {
  const raw = readFileSync(sqlPath, "utf8").replace(/^\uFEFF/, "");
  const withoutComments = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  if (
    /DROP\s+|TRUNCATE\s+|SET\s+NOT\s+NULL|ALTER\s+COLUMN[\s\S]{0,40}TYPE/i.test(
      withoutComments,
    )
  ) {
    console.error("FAIL: destructive SQL pattern detected");
    process.exit(1);
  }
  if (
    /UPDATE\s+"Organizer"|INSERT\s+INTO\s+"PublicPartner"|DELETE\s+FROM\s+"Organizer"/i.test(
      withoutComments,
    )
  ) {
    console.error("FAIL: Organizer mutation / backfill SQL not allowed");
    process.exit(1);
  }

  const statements = splitStatements(raw);
  const client = await pool.connect();
  try {
    let ok = 0;
    let skip = 0;
    for (const stmt of statements) {
      const result = await execIgnoreDup(client, stmt.endsWith(";") ? stmt : `${stmt};`);
      if (result === "ok") ok += 1;
      else skip += 1;
    }
    console.log(
      JSON.stringify({
        ok: true,
        applied: ok,
        skipped: skip,
        statements: statements.length,
      }),
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
