/**
 * Mobile onsite operations portal
 *   npm run verify:mobile-ops-portal
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  hashOnsiteOpsToken,
  onsiteOpsTokensEqual,
  parseOnsiteOpsTab,
} from "../src/lib/onsite-ops/token";
import { generateOnsiteOpsToken } from "../src/lib/onsite-ops/token";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertStaticWiring() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model EventOnsiteOpsAccessLink/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);

  const page = read("src/app/ops/[token]/page.tsx");
  assert.match(page, /OnsiteOpsWeighInTab/);
  assert.match(page, /OnsiteOpsMatchOpsTab/);
  assert.match(page, /OnsiteOpsTokenProvider/);

  const qr = read("src/app/(dashboard)/organizer/events/[eventId]/qr/page.tsx");
  assert.match(qr, /OnsiteOpsLinkManager/);

  const resolveCaller = read("src/lib/onsite-ops/resolve-caller.ts");
  assert.match(resolveCaller, /resolveFieldOpsCallerFromMutation/);

  const fieldActions = read("src/features/field-status/actions.ts");
  assert.match(fieldActions, /resolveFieldOpsCallerFromMutation/);

  const matchActions = read("src/features/matches/actions.ts");
  assert.match(matchActions, /resolveFieldOpsCallerFromMutation/);

  const resultService = read("src/lib/services/result.service.ts");
  assert.match(resultService, /kind: "onsite-ops"/);

  const judgeActions = read("src/features/match-ops-judge/actions.ts");
  assert.match(judgeActions, /resolveFieldOpsCallerFromMutation/);

  const panel = read("src/components/domain/brackets/OrganizerMatchOpsPanel.tsx");
  assert.match(panel, /useOnsiteOpsToken/);

  const bracketBlock = read("src/features/field-status/actions.ts");
  assert.match(bracketBlock, /대진 패 처리를 할 수 없습니다/);
}

function assertTokenSecurity() {
  const raw = generateOnsiteOpsToken();
  assert.ok(raw.length >= 32);
  const hash = hashOnsiteOpsToken(raw);
  assert.equal(hash.length, 64);
  assert.equal(onsiteOpsTokensEqual(raw, hash), true);
  assert.equal(onsiteOpsTokensEqual("wrong-token", hash), false);
}

function assertTabRouting() {
  assert.equal(parseOnsiteOpsTab("weighin"), "weighin");
  assert.equal(parseOnsiteOpsTab("matches"), "matches");
  assert.equal(parseOnsiteOpsTab("match-ops"), "matches");
  assert.equal(parseOnsiteOpsTab(null), "weighin");
}

function assertFieldOpsAuth() {
  const auth = read("src/lib/field-operations-auth.ts");
  assert.match(auth, /kind: "onsite-ops"/);
  assert.match(auth, /kind: "actor"/);
}

function main() {
  assertStaticWiring();
  assertTokenSecurity();
  assertTabRouting();
  assertFieldOpsAuth();
  console.log("verify:mobile-ops-portal: OK");
}

main();
