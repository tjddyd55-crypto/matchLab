/**
 * GymStatus 플랫폼 게이트 — suspended/archived 시 portal/action 차단.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const portal = read("src/lib/gym-portal-access.ts");
assert.match(portal, /gym\.status !== GymStatus\.active/);
assert.match(portal, /platformGymStatusBlocked/);
assert.match(portal, /requireGymPortalRead/);
assert.match(portal, /requireGymPortalWrite/);
assert.match(portal, /requireGymPortalSalesManage/);

const layout = read("src/app/(dashboard)/gym/layout.tsx");
assert.match(layout, /platform_suspended/);
assert.match(layout, /체육관 이용 제한/);

console.log("verify:gym-approval-route-guard: OK");
