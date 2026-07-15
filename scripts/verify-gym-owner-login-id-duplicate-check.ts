/**
 * 초대 화면 아이디 중복확인 버튼·상태 계약
 *   npm run verify:gym-owner-login-id-duplicate-check
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function main() {
  const form = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/member-gyms/MemberGymOwnerInviteAcceptForm.tsx",
    ),
    "utf8",
  );

  assert.ok(form.includes("중복확인"));
  assert.ok(form.includes("runDuplicateCheck"));
  assert.ok(form.includes("checkMemberGymOwnerInviteLoginIdAction"));
  assert.ok(form.includes('"idle"'));
  assert.ok(form.includes('"checking"'));
  assert.ok(form.includes('"available"'));
  assert.ok(form.includes('"unavailable"'));
  assert.ok(form.includes("사용 가능한 아이디입니다."));
  assert.ok(form.includes("loginIdReady"));
  assert.ok(form.includes("canSubmit"));
  // 아이디 변경 시 중복확인 초기화
  assert.ok(form.includes('setLoginIdCheck("idle")'));
  assert.ok(form.includes("setCheckedLoginId(null)"));
  // blur 단독 의존 금지 — 명시 버튼
  assert.equal(form.includes("onBlur="), false);

  const service = readFileSync(
    join(process.cwd(), "src/lib/services/gym-owner-account.service.ts"),
    "utf8",
  );
  assert.ok(service.includes("isLoginIdAvailableForInvite"));
  assert.ok(service.includes("loginIdToAuthEmail(loginId)"));
  assert.ok(
    /async acceptOwnerInvite[\s\S]*?findFirst\(\{\s*where:\s*\{\s*loginId/.test(
      service,
    ),
  );

  const actions = readFileSync(
    join(process.cwd(), "src/features/gym-owner-account/actions.ts"),
    "utf8",
  );
  assert.ok(actions.includes("checkMemberGymOwnerInviteLoginIdAction"));

  console.log("verify:gym-owner-login-id-duplicate-check: OK");
}

main();
