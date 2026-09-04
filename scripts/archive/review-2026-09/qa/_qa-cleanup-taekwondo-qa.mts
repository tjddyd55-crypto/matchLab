import { execSync } from "node:child_process";
import pg from "pg";

const raw = execSync(
  "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
  { encoding: "utf8" },
).replace(/^\uFEFF/, "");
const dbUrl = JSON.parse(raw).DATABASE_PUBLIC_URL as string;
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
const qa = await pool.query(
  `SELECT id, code FROM "MemberSportTemplate" WHERE code LIKE '%QA%' OR code LIKE '%_COPY%'`,
);
console.log("qa templates", qa.rows);
for (const row of qa.rows) {
  await pool.query(
    `DELETE FROM "MemberSportTemplateField" WHERE "templateId" = $1`,
    [row.id],
  );
  await pool.query(`DELETE FROM "MemberSportTemplate" WHERE id = $1`, [row.id]);
  console.log("deleted", row.code);
}
await pool.end();
