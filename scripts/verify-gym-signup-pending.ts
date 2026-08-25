/**
 * 플랫폼 체육관 가입 승인 게이트 SSOT 검증.
 * GymApplication pending → admin approve → invite activate 전까지 운영 접근 불가.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const service = read("src/lib/services/gym-application.service.ts");
assert.match(service, /status:\s*GymApplicationStatus\.pending/);
assert.match(service, /associationMemberGymCreated:\s*false/);
assert.match(service, /async approve\(/);
assert.match(service, /async acceptOwnerInvite\(/);
assert.match(service, /authUserId:\s*null/);
assert.doesNotMatch(
  service.slice(service.indexOf("async submit"), service.indexOf("async listForAdmin")),
  /tx\.gym\.create|prisma\.gym\.create/,
);

const portal = read("src/lib/gym-portal-access.ts");
assert.match(portal, /GymStatus\.active/);
assert.match(portal, /platform_suspended/);

const review = read(
  "src/components/domain/gym-applications/GymApplicationReviewActions.tsx",
);
assert.match(review, /useAppConfirmDialog/);
assert.match(review, /MATCHON 이용을 승인/);

const adminList = read("src/app/(dashboard)/admin/gym-applications/page.tsx");
assert.match(adminList, /status=\$\{item\.id\}/);
assert.match(adminList, /getGymPlatformApplicationStatusLabel/);
assert.match(adminList, /승인대기/);

const joinForm = read("src/components/domain/gym-join/GymJoinApplicationForm.tsx");
assert.match(joinForm, /승인 전까지 체육관 관리/);

const schema = read("prisma/schema.prisma");
assert.match(schema, /enum GymApplicationStatus/);
assert.match(schema, /model GymApplication/);

console.log("verify:gym-signup-pending: OK");
