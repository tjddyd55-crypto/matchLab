/**
 * Railway pre-deploy migration gate.
 * Runs migrate status (observability) then migrate deploy (pending only).
 * Exits non-zero on failure — deployment must not proceed.
 *
 * Production-safe: migrate deploy only. Never migrate dev / db push.
 */
import "dotenv/config";
import { execSync } from "node:child_process";

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

function runStep(label: string, command: string) {
  console.log(`[db:migrate:gate] ${label}`);
  execSync(command, { stdio: "inherit", env: process.env });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[db:migrate:gate] DATABASE_URL is missing — aborting deploy");
  process.exit(1);
}

const fingerprint = parseDbFingerprint(databaseUrl);
const environment =
  process.env.RAILWAY_ENVIRONMENT_NAME ??
  process.env.RAILWAY_ENVIRONMENT ??
  process.env.NODE_ENV ??
  "unknown";

console.log("[db:migrate:gate] database fingerprint", {
  host: fingerprint.host,
  port: fingerprint.port,
  database: fingerprint.database,
  environment,
});

runStep("prisma migrate status", "npx prisma migrate status");
runStep("prisma migrate deploy", "npx prisma migrate deploy");

console.log("[db:migrate:gate] migration gate passed");
