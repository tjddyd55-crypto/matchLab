/**
 * 회원사 초대 활성화 ↔ 로그인 Auth SSOT 정적·단위 검증
 *   npm run verify:gym-owner-login-id-activation
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loginIdToAuthEmail } from "../src/lib/fighter-login";
import {
  isSyntheticAuthEmail,
  isPlaceholderGymOwnerUser,
  resolveMemberGymOwnerDisplay,
} from "../src/lib/member-gym/owner-account";
import {
  isReservedLoginId,
  isValidLoginId,
  loginIdSchema,
} from "../src/lib/validators/login-id.validator";

function assertSource(pathFromRoot: string, needles: string[], label: string) {
  const src = readFileSync(join(process.cwd(), pathFromRoot), "utf8");
  for (const n of needles) {
    assert.ok(src.includes(n), `${label}: missing ${JSON.stringify(n)}`);
  }
}

function main() {
  // 1) loginId 규칙
  assert.equal(isValidLoginId("testgym01"), true);
  assert.equal(isValidLoginId("Admin"), false); // reserved after normalize
  assert.equal(isReservedLoginId("gym"), true);
  assert.equal(isReservedLoginId("matchon"), true);
  assert.equal(loginIdSchema.safeParse("ab").success, false);
  assert.equal(loginIdSchema.safeParse("testgym01").success, true);
  assert.equal(loginIdSchema.safeParse("한글아이디").success, false);
  assert.equal(
    loginIdSchema.safeParse("admin").error?.issues[0]?.message,
    "사용할 수 없는 아이디입니다.",
  );

  // 2) Auth email SSOT
  const authEmail = loginIdToAuthEmail("testgym01");
  assert.ok(authEmail.endsWith("@internal.matchlab.local"));
  assert.equal(isSyntheticAuthEmail(authEmail), true);
  assert.equal(isSyntheticAuthEmail("owner@example.com"), false);
  assert.equal(
    isPlaceholderGymOwnerUser({
      loginId: "testgym01",
      email: authEmail,
      authUserId: "auth-1",
    }),
    false,
  );

  // 3) 표시: User.email=synthetic → 신청 이메일 노출
  const display = resolveMemberGymOwnerDisplay({
    owner: {
      name: "홍길동",
      email: authEmail,
      loginId: "testgym01",
      authUserId: "auth-1",
    },
    inviteEmail: null,
    application: { email: "applicant@example.com", ownerName: "홍길동" },
  });
  assert.equal(display.displayEmail, "applicant@example.com");
  assert.notEqual(display.displayEmail, authEmail);

  // 4) acceptOwnerInvite는 User.email = authEmail (신청 이메일 아님)
  assertSource(
    "src/lib/services/gym-owner-account.service.ts",
    [
      "email: authEmail",
      "loginIdToAuthEmail(loginId)",
      "loginIdSchema",
      "passwordSchema",
    ],
    "acceptOwnerInvite",
  );
  const serviceSrc = readFileSync(
    join(process.cwd(), "src/lib/services/gym-owner-account.service.ts"),
    "utf8",
  );
  assert.ok(
    /async acceptOwnerInvite[\s\S]*?email:\s*authEmail[\s\S]*?role:\s*UserRole\.gym/.test(
      serviceSrc,
    ),
    "acceptOwnerInvite must persist User.email = authEmail",
  );
  assert.equal(
    /async acceptOwnerInvite[\s\S]*?tx\.user\.create\([\s\S]*?email:\s*row\.ownerInviteEmail/.test(
      serviceSrc,
    ),
    false,
    "must not store invite contact email as User.email on create",
  );

  // 5) 로그인 resolve / 활성화 안내
  assertSource(
    "src/lib/services/auth.service.ts",
    ["loginIdToAuthEmail", 'byLoginId.role === "gym"'],
    "resolveAuthEmailForLogin",
  );
  assertSource(
    "src/components/domain/auth/LoginForm.tsx",
    ["activatedBanner", "defaultLoginId", "회원사 계정이 활성화되었습니다"],
    "LoginForm",
  );
  assertSource(
    "src/app/(auth)/login/page.tsx",
    ["activated", "loginId"],
    "login page",
  );
  assertSource(
    "src/components/domain/member-gyms/MemberGymOwnerInviteAcceptForm.tsx",
    [
      "passwordConfirm",
      "연락 이메일",
      "window.location.assign",
      "checkMemberGymOwnerInviteLoginIdAction",
    ],
    "invite accept form",
  );

  console.log("verify:gym-owner-login-id-activation: OK");
}

main();
