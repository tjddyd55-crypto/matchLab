/**
 * Production read-only audit — placeholder Gym only. No writes.
 *   npx tsx scripts/audit-production-placeholder-gym-readonly.mts
 */
import { execSync } from "node:child_process";
import { Client } from "pg";

function railwayJson(service: string, env: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e ${env} -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function main() {
  const pg = railwayJson("Postgres", "production");
  const url = String(pg.DATABASE_PUBLIC_URL || "");
  if (!/yamabiko/i.test(url)) {
    throw new Error("expected production yamabiko URL");
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const gyms = await client.query<{
    id: string;
    name: string;
    loginId: string;
    fighters: number;
    apps: number;
  }>(`
    SELECT g.id, g.name, u."loginId",
      (SELECT count(*)::int FROM "Fighter" f WHERE f."currentGymId" = g.id) AS fighters,
      (SELECT count(*)::int FROM "EventApplication" a WHERE a."gymId" = g.id) AS apps
    FROM "Gym" g
    JOIN "User" u ON u.id = g."ownerUserId"
    WHERE u."loginId" LIKE 'ext-reg-%'
       OR g.name LIKE 'MATCHON 외부등록%'
    ORDER BY apps DESC
    LIMIT 20
  `);

  const report: Record<string, unknown> = {
    placeholders: gyms.rows,
  };

  if (gyms.rows[0]) {
    const id = gyms.rows[0].id;
    const sample = await client.query(
      `
      SELECT id,
        "gymSnapshot"->>'name' AS snap_name,
        "fighterSnapshot"->>'gymName' AS fighter_gym_name
      FROM "EventApplication"
      WHERE "gymId" = $1
      LIMIT 8
    `,
      [id],
    );
    const distinct = await client.query(
      `
      SELECT "gymSnapshot"->>'name' AS name, count(*)::int AS n
      FROM "EventApplication"
      WHERE "gymId" = $1
      GROUP BY 1
      ORDER BY n DESC
      LIMIT 20
    `,
      [id],
    );
    report.topPlaceholderId = id;
    report.sampleApps = sample.rows;
    report.distinctSnapNames = distinct.rows;
    report.backfillReady = distinct.rows.every(
      (r) =>
        r.name &&
        typeof r.name === "string" &&
        !String(r.name).startsWith("MATCHON 외부등록"),
    );
    report.deletionReady = false;
  }

  console.log(JSON.stringify(report, null, 2));
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
