/**
 * 독립 Gym 대회 신청 — AssociationMemberGym 필수 아님.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const appService = read("src/lib/services/application.service.ts");
  assert.ok(!appService.includes("associationMemberGym"));
  assert.ok(!appService.includes("AssociationMemberGym"));

  const portal = read("src/lib/gym-portal-access.ts");
  assert.ok(portal.includes("normal_gym"));
  assert.ok(portal.includes("canEnterPortal: true"));

  const nav = read("src/lib/navigation/gym-portal-navigation.ts");
  assert.ok(nav.includes("/gym/events"));
  assert.ok(nav.includes("/gym/applications"));

  console.log("verify:gym-event-application-without-association: OK");
}

main();
