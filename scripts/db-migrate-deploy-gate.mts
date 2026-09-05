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

function runMigrateStatusObservability(): void {
  console.log("[db:migrate:gate] prisma migrate status");
  let output = "";
  try {
    output = execSync("npx prisma migrate status", {
      encoding: "utf8",
      env: process.env,
    });
    process.stdout.write(output);
    return;
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    output = [err.stdout ?? "", err.stderr ?? ""].filter(Boolean).join("\n");
    if (output) {
      process.stdout.write(output);
      if (!output.endsWith("\n")) process.stdout.write("\n");
    }

    if (isFatalMigrateStatus(output)) {
      console.error("[db:migrate:gate] prisma migrate status — fatal drift detected");
      process.exit(err.status ?? 1);
    }

    if (hasPendingMigrationsOnly(output)) {
      console.log(
        "[db:migrate:gate] prisma migrate status — pending migrations only; continuing to migrate deploy",
      );
      return;
    }

    console.error("[db:migrate:gate] prisma migrate status — unexpected non-zero exit");
    process.exit(err.status ?? 1);
  }
}

function isFatalMigrateStatus(output: string): boolean {
  if (/failed migration|P3009|P3018/i.test(output)) return true;
  if (/was modified after it was applied/i.test(output)) return true;
  if (/checksum/i.test(output) && /does not match/i.test(output)) return true;

  const historyMismatch =
    /local migration history and the migrations table from your database are different/i.test(
      output,
    );
  const missingLocally =
    /migration from the database are not found locally in prisma\/migrations/i.test(
      output,
    );

  return historyMismatch || missingLocally;
}

function hasPendingMigrationsOnly(output: string): boolean {
  if (/Database schema is up to date/i.test(output)) return false;
  if (isFatalMigrateStatus(output)) return false;

  return (
    /Following migrations? have not yet been applied/i.test(output) ||
    /Database schema is not up to date/i.test(output)
  );
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

function resolveDbAlias(host: string): string {
  if (host.includes("yamanote")) return "yamanote (development)";
  if (host.includes("yamabiko")) return "yamabiko (production)";
  if (host === "postgres.railway.internal") {
    return `railway-internal (${environment})`;
  }
  return "unknown";
}

console.log("[db:migrate:gate] database fingerprint", {
  host: fingerprint.host,
  port: fingerprint.port,
  database: fingerprint.database,
  environment,
  alias: resolveDbAlias(fingerprint.host),
});

runMigrateStatusObservability();
runStep("prisma migrate deploy", "npx prisma migrate deploy");

console.log("[db:migrate:gate] migration gate passed");
