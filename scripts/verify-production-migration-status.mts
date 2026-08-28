/**
 * Read-only migration / schema drift diagnostic.
 * Uses DATABASE_URL from the environment — never writes schema or app data.
 *
 * Local / Railway shell:
 *   npm run verify:production-migration-status
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "test-results", "production-migration-status");
mkdirSync(OUT, { recursive: true });

function parseDbFingerprint(databaseUrl: string) {
  try {
    const u = new URL(databaseUrl);
    return {
      host: u.hostname,
      port: u.port || "5432",
      database: u.pathname.replace(/^\//, "") || "unknown",
    };
  } catch {
    return { host: "unknown", port: "unknown", database: "unknown" };
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const fingerprint = parseDbFingerprint(databaseUrl);
const environment =
  process.env.RAILWAY_ENVIRONMENT_NAME ??
  process.env.RAILWAY_ENVIRONMENT ??
  process.env.NODE_ENV ??
  "unknown";

console.log("[verify:production-migration-status] fingerprint", {
  ...fingerprint,
  environment,
});

let statusOutput = "";
try {
  statusOutput = execSync("npx prisma migrate status", {
    encoding: "utf8",
    env: process.env,
  });
  console.log(statusOutput);
} catch (error) {
  const err = error as { stdout?: string; stderr?: string; status?: number };
  statusOutput = [err.stdout ?? "", err.stderr ?? ""].filter(Boolean).join("\n");
  console.error(statusOutput);
  writeFileSync(
    join(OUT, "report.json"),
    JSON.stringify({ fingerprint, environment, statusOutput, ok: false }, null, 2),
  );
  process.exit(err.status ?? 1);
}

const hasPending =
  /Following migrations have not yet been applied/i.test(statusOutput) ||
  /Database schema is not up to date/i.test(statusOutput);

const report = {
  fingerprint,
  environment,
  hasPending,
  ok: !hasPending,
  statusOutput,
};

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

if (hasPending) {
  console.error("verify:production-migration-status: pending migrations detected");
  process.exit(1);
}

console.log("verify:production-migration-status: PASS (no pending migrations)");
