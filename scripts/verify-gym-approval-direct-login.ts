/**
 * 체육관 가입 승인 후 즉시 로그인 SSOT.
 * - 가입 시 password → Supabase Auth만 (앱 DB plaintext 금지)
 * - 승인 시 User/Gym + authUserId 연결, invite 없음
 * - pending 중 /gym 접근 불가
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const service = read("src/lib/services/gym-application.service.ts");
assert.match(service, /pendingAuthUserId/);
assert.match(service, /supabase\.auth\.admin\.createUser/);
assert.match(service, /loginReady:\s*true/);
assert.match(service, /approveLegacyWithInvite/);
assert.match(service, /associationMemberGymCreated:\s*false/);
// App DB must not persist password / passwordHash columns on GymApplication
assert.doesNotMatch(service, /passwordHash|plaintext/);
const createBlock = service.slice(
  service.indexOf("tx.gymApplication.create"),
  service.indexOf("async listForAdmin"),
);
assert.doesNotMatch(createBlock, /\bpassword\b\s*:/);
assert.doesNotMatch(createBlock, /passwordConfirm/);
// submit must not create Gym/User
assert.doesNotMatch(
  service.slice(service.indexOf("async submit"), service.indexOf("async listForAdmin")),
  /tx\.gym\.create|tx\.user\.create/,
);
// direct approve path must not mint invite token when pendingAuth exists
const approveStart = service.indexOf("async approve(");
const legacyStart = service.indexOf("async approveLegacyWithInvite");
assert.ok(approveStart >= 0 && legacyStart > approveStart);
const directApprove = service.slice(approveStart, legacyStart);
assert.match(directApprove, /authUserId:\s*pendingAuthUserId/);
assert.match(directApprove, /ownerInviteTokenHash:\s*null/);
assert.doesNotMatch(directApprove, /randomBytes\(24\)/);

const schema = read("prisma/schema.prisma");
assert.match(schema, /pendingAuthUserId\s+String\?\s+@unique/);

const form = read("src/components/domain/gym-join/GymJoinApplicationForm.tsx");
assert.match(form, /name="password"/);
assert.match(form, /name="passwordConfirm"/);
assert.match(form, /관리자 승인 후 신청한 계정으로 로그인/);
assert.match(form, /승인 전까지/);
assert.doesNotMatch(form, /계정 초대 링크가 안내/);

const review = read(
  "src/components/domain/gym-applications/GymApplicationReviewActions.tsx",
);
assert.match(review, /체육관 승인/);
assert.match(review, /loginReady/);
assert.match(review, /별도 초대 링크는 필요하지 않습니다/);
assert.doesNotMatch(review, /승인 및 계정 초대 발급/);

const actions = read("src/features/gym-applications/actions.ts");
assert.match(actions, /passwordConfirm/);

const auth = read("src/features/auth/authenticate-password.ts");
assert.match(auth, /GYM_APPLICATION_PENDING_MESSAGE|관리자 승인 대기/);
assert.match(auth, /pendingAuthUserId/);

const portal = read("src/lib/gym-portal-access.ts");
assert.match(portal, /GymStatus\.active/);

const api = read(
  "src/app/api/admin/gym-applications/[applicationId]/approve/route.ts",
);
assert.match(api, /loginReady/);

console.log("verify:gym-approval-direct-login: OK");
console.log("verify:gym-approval-no-invite-required: OK");
console.log("verify:gym-pending-access-blocked: OK");
