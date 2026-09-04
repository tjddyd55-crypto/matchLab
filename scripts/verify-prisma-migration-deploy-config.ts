/**
 * Static SSOT: Production deploy must run prisma migrate deploy before app start.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readJson(rel: string): unknown {
  const path = join(root, rel);
  assert.ok(existsSync(path), `${rel} must exist`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function readPackageScripts(): Record<string, string> {
  const pkg = readJson("package.json") as { scripts?: Record<string, string> };
  assert.ok(pkg.scripts, "package.json scripts required");
  return pkg.scripts;
}

const FORBIDDEN_IN_PREDEPLOY = [
  "migrate dev",
  "db push",
  "migrate reset",
  "|| true",
  "continue-on-error",
];

function assertRailwayDeployMigrationGate() {
  const tomlPath = join(root, "railway.toml");
  const iacPath = join(root, ".railway", "railway.ts");

  assert.ok(
    existsSync(tomlPath) || existsSync(iacPath),
    "railway.toml or .railway/railway.ts must exist",
  );

  const sources: string[] = [];
  if (existsSync(tomlPath)) sources.push(readFileSync(tomlPath, "utf8"));
  if (existsSync(iacPath)) sources.push(readFileSync(iacPath, "utf8"));

  const combined = sources.join("\n");
  assert.ok(
    combined.includes("db:migrate:gate"),
    "deploy config must invoke npm run db:migrate:gate (railway.toml preDeployCommand or IaC preDeploy)",
  );

  const deployCommandValues: string[] = [];
  if (existsSync(tomlPath)) {
    const toml = readFileSync(tomlPath, "utf8");
    const match = toml.match(/preDeployCommand\s*=\s*\[([\s\S]*?)\]/);
    if (match) deployCommandValues.push(match[1]);
  }
  if (existsSync(iacPath)) {
    const iac = readFileSync(iacPath, "utf8");
    const match = iac.match(/preDeploy\s*:\s*["'`]([^"'`]+)["'`]/);
    if (match) deployCommandValues.push(match[1]);
  }

  assert.ok(deployCommandValues.length > 0, "preDeploy command must be defined");
  const deployCommands = deployCommandValues.join(" ");
  assert.ok(
    deployCommands.includes("db:migrate:gate"),
    "preDeploy must invoke npm run db:migrate:gate",
  );

  for (const forbidden of FORBIDDEN_IN_PREDEPLOY) {
    assert.equal(
      deployCommands.includes(forbidden),
      false,
      `preDeploy command must not include ${JSON.stringify(forbidden)}`,
    );
  }

  const legacyPath = join(root, "railway.json");
  assert.equal(
    existsSync(legacyPath),
    false,
    "deprecated railway.json must be removed (use railway.toml + .railway/railway.ts)",
  );

  console.log("verify:prisma-migration-deploy-config: deploy migration gate OK");
}

function assertPackageScripts() {
  const scripts = readPackageScripts();

  assert.ok(scripts["db:migrate:status"], "db:migrate:status script required");
  assert.equal(scripts["db:migrate:status"], "prisma migrate status");

  assert.ok(scripts["db:migrate:deploy"], "db:migrate:deploy script required");
  assert.equal(scripts["db:migrate:deploy"], "prisma migrate deploy");

  assert.ok(scripts["db:migrate:gate"], "db:migrate:gate script required");
  assert.match(scripts["db:migrate:gate"], /db-migrate-deploy-gate/);

  assert.equal(scripts["start"], "next start", "start command must remain next start");
  assert.equal(scripts["build"], "npm run db:generate && next build");

  console.log("verify:prisma-migration-deploy-config: package scripts OK");
}

function assertDocs() {
  const deployDoc = readFileSync(join(root, "docs/deploy-railway.md"), "utf8");
  const runbook = readFileSync(join(root, "docs/operations/runbook.md"), "utf8");

  assert.ok(deployDoc.includes("preDeploy"), "docs/deploy-railway.md must document preDeploy migration");
  assert.ok(deployDoc.includes("db:migrate:gate"), "docs/deploy-railway.md must reference db:migrate:gate");
  assert.ok(
    deployDoc.includes("railway.toml") || deployDoc.includes(".railway/railway.ts"),
    "docs/deploy-railway.md must reference deploy config SSOT",
  );

  assert.ok(runbook.includes("preDeploy"), "docs/operations/runbook.md must document preDeploy");
  assert.ok(
    runbook.includes("railway.toml") || runbook.includes(".railway/railway.ts"),
    "docs/operations/runbook.md must reference deploy config SSOT",
  );

  console.log("verify:prisma-migration-deploy-config: docs OK");
}

assertRailwayDeployMigrationGate();
assertPackageScripts();
assertDocs();
console.log("verify:prisma-migration-deploy-config: PASS");
