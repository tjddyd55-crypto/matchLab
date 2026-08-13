/**
 * Development yamanote preflight backup (schema + counts).
 * Never prints DATABASE_URL. Never touches yamabiko.
 */
import "dotenv/config";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL?.trim() || "";
if (!/yamanote/i.test(DATABASE_URL) || /yamabiko/i.test(DATABASE_URL)) {
  const host = DATABASE_URL.match(/@([^/]+)\//)?.[1] ?? "unknown";
  console.error(`REFUSING DB write: expected Development yamanote host, got host=${host}`);
  process.exit(1);
}
const host = DATABASE_URL.match(/@([^/]+)\//)?.[1] ?? "";

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "0" ? undefined : { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const version = (await client.query("show server_version")).rows[0]
      .server_version as string;
    const size = (
      await client.query(
        "select pg_database_size(current_database())::bigint as bytes, pg_size_pretty(pg_database_size(current_database())) as pretty",
      )
    ).rows[0] as { bytes: string; pretty: string };
    const db = (await client.query("select current_database() as name")).rows[0]
      .name as string;
    const cols = (
      await client.query(
        `select column_name, data_type, is_nullable
         from information_schema.columns
         where table_schema = 'public' and table_name = 'EventApplication'
         order by ordinal_position`,
      )
    ).rows as Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>;
    const counts = (
      await client.query(
        `select relname, n_live_tup::bigint as n
         from pg_stat_user_tables
         order by relname`,
      )
    ).rows as Array<{ relname: string; n: string }>;
    const selfReg = (
      await client.query(
        `select table_name
         from information_schema.tables
         where table_schema = 'public'
           and table_name in (
             'GymMemberSelfRegistrationLink',
             'GymMemberRegistrationTerms',
             'GymMemberRegistrationRequest'
           )
         order by table_name`,
      )
    ).rows.map((row) => row.table_name as string);

    mkdirSync(".local-backups", { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const rel = `.local-backups/yamanote-pre-insurance-pii-${stamp}.json`;
    const payload = {
      createdAt: new Date().toISOString(),
      hostFingerprint: host.replace(/[0-9]+/g, "#"),
      database: db,
      serverVersion: version,
      bytes: Number(size.bytes),
      pretty: size.pretty,
      eventApplicationColumns: cols,
      tableCounts: counts,
      selfRegistrationTables: selfReg,
    };
    writeFileSync(rel, JSON.stringify(payload, null, 2), "utf8");
    const inspect = JSON.parse(readFileSync(rel, "utf8")) as typeof payload;
    console.log(
      JSON.stringify({
        ok: true,
        rel,
        fileBytes: statSync(rel).size,
        dbBytes: Number(size.bytes),
        pretty: size.pretty,
        serverVersion: version,
        eventApplicationColCount: cols.length,
        hasInsuranceRrn: cols.some((c) => c.column_name === "insuranceRrnCipher"),
        selfRegTables: selfReg.length,
        inspectOk: inspect.database === db,
      }),
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL", error instanceof Error ? error.message : error);
  process.exit(1);
});
