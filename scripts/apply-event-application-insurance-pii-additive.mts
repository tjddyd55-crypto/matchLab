/**
 * Apply EventApplication insurance PII additive schema.
 * Development yamanote only. Never drops. Never prints DATABASE_URL.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) {
  console.error("FAIL: DATABASE_URL required");
  process.exit(1);
}
if (!/yamanote/i.test(DATABASE_URL) || /yamabiko/i.test(DATABASE_URL)) {
  const host = DATABASE_URL.match(/@([^/]+)\//)?.[1] ?? "unknown";
  console.error(`FAIL: expected Development yamanote host, got host=${host}`);
  process.exit(1);
}

const sqlPath =
  process.env.SQL_PATH?.trim() ||
  "scripts/sql/add-event-application-insurance-pii-additive.sql";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "0"
      ? undefined
      : { rejectUnauthorized: false },
});

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

  const client = await pool.connect();
  try {
    await client.query(raw);
    console.log(JSON.stringify({ ok: true, applied: 1, sqlPath }));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
