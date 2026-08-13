/**
 * Confirm additive insurance columns on yamanote. Never prints DATABASE_URL.
 */
import "dotenv/config";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL?.trim() || "";
if (!/yamanote/i.test(DATABASE_URL) || /yamabiko/i.test(DATABASE_URL)) {
  console.error("FAIL: expected Development yamanote");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "0" ? undefined : { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    const cols = (
      await client.query(
        `select column_name, data_type, is_nullable
         from information_schema.columns
         where table_schema = 'public' and table_name = 'EventApplication'
           and column_name in (
             'recordText','careerText',
             'insuranceRrnCipher','insuranceRrnIv','insuranceRrnAuthTag',
             'insuranceRrnKeyVer','insuranceRrnMasked','insuranceConsentSnapshot'
           )
         order by column_name`,
      )
    ).rows as Array<{ column_name: string; data_type: string; is_nullable: string }>;
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
    console.log(
      JSON.stringify({
        ok:
          cols.length === 8 &&
          cols.every((c) => c.is_nullable === "YES") &&
          selfReg.length === 3,
        columns: cols,
        selfRegTables: selfReg,
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
