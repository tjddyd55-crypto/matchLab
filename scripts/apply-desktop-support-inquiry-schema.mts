/**
 * Apply additive DesktopSupportInquiry schema.
 * Usage:
 *   npx tsx scripts/apply-desktop-support-inquiry-schema.mts --preview
 *   npx tsx scripts/apply-desktop-support-inquiry-schema.mts --production
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Pool } from "pg";

const isProd = process.argv.includes("--production");
const pgPath = isProd ? "tmp-prod-pg.json" : "tmp-prev-pg.json";
const outPath = isProd
  ? "tmp-prod-desktop-support-inquiry-schema-apply.json"
  : "tmp-preview-desktop-support-inquiry-schema-apply.json";

const pg = JSON.parse(readFileSync(pgPath, "utf8").replace(/^\uFEFF/, ""));
const sql = readFileSync(
  "prisma/migrations_manual/20260731_desktop_support_inquiry.sql",
  "utf8",
);

const sqlNoComments = sql
  .split(/\r?\n/)
  .map((line) => line.replace(/--.*$/, "").replace(/\r/g, ""))
  .join("\n");

const forSafety = sqlNoComments.replace(
  /ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)/gi,
  "",
);
const unsafe = forSafety.match(
  /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bSET\s+NOT\s+NULL\b/gi,
);
if (unsafe) {
  console.error("UNSAFE SQL", unsafe);
  process.exit(1);
}

const pool = new Pool({
  connectionString: pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const client = await pool.connect();
const result: Record<string, unknown> = {
  env: isProd ? "production" : "preview",
  ok: false,
};

try {
  const cleaned = sql
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  const statements: string[] = [];
  let buf = "";
  let inDo = false;
  for (const line of cleaned.split("\n")) {
    buf += `${line}\n`;
    if (/^\s*DO\s+\$\$/i.test(line)) inDo = true;
    if (inDo && /END\s+\$\$\s*;?\s*$/i.test(line.trim())) {
      statements.push(buf.trim());
      buf = "";
      inDo = false;
      continue;
    }
    if (!inDo && /;\s*$/.test(line.trim()) && buf.trim()) {
      statements.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) statements.push(buf.trim());

  const errors: string[] = [];
  for (const statement of statements) {
    try {
      await client.query(statement);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already exists/i.test(msg)) continue;
      errors.push(msg);
    }
  }
  result.ok = errors.length === 0;
  result.applied = true;
  result.statementCount = statements.length;
  if (errors.length) result.errors = errors;
} finally {
  client.release();
  await pool.end();
}

writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
