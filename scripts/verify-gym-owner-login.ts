/**
 * 회원사 loginId → Auth email 해석·로그인 redirect SSOT
 *   npm run verify:gym-owner-login
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loginIdToAuthEmail } from "../src/lib/fighter-login";

function main() {
  assert.equal(
    loginIdToAuthEmail("testgym01"),
    "testgym01@internal.matchlab.local",
  );

  const actorSrc = readFileSync(
    join(process.cwd(), "src/lib/auth/actor.ts"),
    "utf8",
  );
  assert.ok(actorSrc.includes('return "/gym"'));

  const actions = readFileSync(
    join(process.cwd(), "src/features/auth/actions.ts"),
    "utf8",
  );
  assert.ok(actions.includes("resolveAuthEmailForLogin"));
  assert.ok(actions.includes("signInWithPassword"));
  assert.ok(actions.includes("dashboardPathForRole(actor.role)"));
  assert.ok(actions.includes("아이디 또는 비밀번호를 확인해 주세요"));

  const authSvc = readFileSync(
    join(process.cwd(), "src/lib/services/auth.service.ts"),
    "utf8",
  );
  assert.ok(authSvc.includes("isEmailLoginIdentifier"));
  assert.ok(authSvc.includes("findUserByLoginId"));
  // placeholder 이메일을 로그인 identifier로 쓰지 않음
  assert.equal(authSvc.includes("manual-gym-"), false);

  const acceptForm = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/member-gyms/MemberGymOwnerInviteAcceptForm.tsx",
    ),
    "utf8",
  );
  assert.ok(acceptForm.includes('activated: "1"'));
  assert.ok(acceptForm.includes("loginId: res.data.loginId"));
  assert.ok(acceptForm.includes("inviteEmail"));
  // 이메일을 loginId 칸 default로 넣지 않음
  assert.equal(acceptForm.includes("defaultValue={inviteEmail}"), false);

  console.log("verify:gym-owner-login: OK");
}

main();
