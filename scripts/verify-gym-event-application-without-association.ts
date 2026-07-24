/**
 * 독립 Gym도 대회 신청 가능 — association 필수 아님 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const access = read("src/lib/gym-portal-access.ts");
assert.ok(access.includes("normal_gym") || access.includes("association"));

const nav = read("src/lib/services/gym-application.service.ts");
assert.ok(nav.includes("associationMemberGymCreated: false"));

console.log("verify:gym-event-application-without-association: OK");
