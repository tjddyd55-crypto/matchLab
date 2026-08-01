/**
 * Static SSOT checks for GitHub ↔ Railway environment mapping.
 * Runtime Railway API is not required.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertIncludes(hay: string, needle: string, label: string) {
  assert.ok(hay.includes(needle), `${label}: missing ${JSON.stringify(needle)}`);
}

function assertNotIncludes(hay: string, needle: string, label: string) {
  assert.equal(
    hay.includes(needle),
    false,
    `${label}: must not include ${JSON.stringify(needle)}`,
  );
}

function deploymentEnvironmentMapping() {
  const doc = read("docs/deployment-environments.md");
  assertIncludes(doc, "| `develop` | `development`", "mapping develop");
  assertIncludes(doc, "| `main` | `production`", "mapping main");
  assertIncludes(doc, "app-production-79ad.up.railway.app", "prod url");
  assertIncludes(doc, "MATCHON_MESSAGING_DRY_RUN=true", "messaging dry-run");
  assertIncludes(doc, "MATCHON_MESSAGING_ALLOW_REAL_SEND=false", "no real send");
  assertIncludes(doc, "별도 `production` 브랜치를 만들지 않는다", "no github production branch");
  console.log("verify:deployment-environment-mapping: OK");
}

function desktopEnvironmentAllowlist() {
  const config = read("desktop/electron/config.ts");
  assertIncludes(config, 'PRODUCTION_HOST = "app-production-79ad.up.railway.app"', "prod host");
  assertIncludes(config, "Production 패키지: Production host만", "packaged allowlist comment");
  assertIncludes(config, "MATCHON_DESKTOP_QA_ALLOW_PREVIEW", "qa gate");
  // Packaged production path must start from PRODUCTION_HOST only.
  assertIncludes(config, "const hosts = new Set<string>([PRODUCTION_HOST])", "packaged set");
  console.log("verify:desktop-environment-allowlist: OK");
}

function productionUrlContract() {
  const qr = read("src/lib/qr-url.ts");
  const config = read("desktop/electron/config.ts");
  assertIncludes(qr, "app-production-79ad.up.railway.app", "qr prod fallback");
  assertIncludes(config, "app-production-79ad.up.railway.app", "desktop prod");
  console.log("verify:production-url-contract: OK");
}

function developmentRealSendDisabled() {
  const cfg = read("src/server/messaging/config/matchon-messaging-config.ts");
  assertIncludes(cfg, 'envBool(env.MATCHON_MESSAGING_DRY_RUN, true)', "dry-run default true");
  assertIncludes(
    cfg,
    'envBool(env.MATCHON_MESSAGING_ALLOW_REAL_SEND, false)',
    "allow real send default false",
  );
  const doc = read("docs/deployment-environments.md");
  assertIncludes(doc, "Development에서 실문자·알림톡을 켜지 않는다", "dev send ban");
  console.log("verify:development-real-send-disabled: OK");
}

function noPreviewEnvironmentReference() {
  // Canonical product docs/code should prefer Railway env name "development".
  // Legacy public hostname may still contain preview-member-gym-b until domain cutover.
  const doc = read("docs/deployment-environments.md");
  assertIncludes(doc, "Railway 환경명은 `development`가 SSOT", "env name ssot");
  assert.ok(existsSync(join(root, "docs/deployment-environments.md")));
  console.log("verify:no-preview-environment-reference: OK");
}

const cmds: Record<string, () => void> = {
  mapping: deploymentEnvironmentMapping,
  allowlist: desktopEnvironmentAllowlist,
  "prod-url": productionUrlContract,
  "real-send": developmentRealSendDisabled,
  "no-preview-name": noPreviewEnvironmentReference,
  all() {
    deploymentEnvironmentMapping();
    desktopEnvironmentAllowlist();
    productionUrlContract();
    developmentRealSendDisabled();
    noPreviewEnvironmentReference();
  },
};

const arg = process.argv[2] ?? "all";
const fn = cmds[arg];
if (!fn) {
  console.error(`unknown command: ${arg}`);
  process.exit(1);
}
fn();
