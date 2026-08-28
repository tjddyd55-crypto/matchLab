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

function assertPreDeployCommand() {
  const railway = readJson("railway.json") as {
    deploy?: { preDeployCommand?: string[] };
  };
  const commands = railway.deploy?.preDeployCommand;
  assert.ok(Array.isArray(commands) && commands.length > 0, "railway.json deploy.preDeployCommand required");

  const joined = commands.join(" ");
  assert.ok(
    joined.includes("db:migrate:gate") || joined.includes("migrate deploy"),
    "preDeployCommand must invoke db:migrate:gate or prisma migrate deploy",
  );

  for (const forbidden of FORBIDDEN_IN_PREDEPLOY) {
    assert.equal(
      joined.includes(forbidden),
      false,
      `preDeployCommand must not include ${JSON.stringify(forbidden)}`,
    );
  }

  console.log("verify:prisma-migration-deploy-config: preDeployCommand OK");
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

  console.log("verify:prisma-migration-deploy-config: package scripts OK");
}

function assertDocs() {
  const doc = readFileSync(join(root, "docs/deploy-railway.md"), "utf8");
  assert.ok(doc.includes("pre-deploy"), "docs/deploy-railway.md must document pre-deploy migration");
  assert.ok(doc.includes("db:migrate:deploy"), "docs/deploy-railway.md must reference db:migrate:deploy");
  console.log("verify:prisma-migration-deploy-config: docs OK");
}

assertPreDeployCommand();
assertPackageScripts();
assertDocs();
console.log("verify:prisma-migration-deploy-config: PASS");
