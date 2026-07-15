/**
 * 초대 화면 passwordConfirm 필수·서버 일치 검증 계약
 *   npm run verify:gym-owner-password-confirm
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { passwordSchema } from "../src/lib/validators/password.validator";

function main() {
  assert.equal(passwordSchema.safeParse("short").success, false);
  assert.equal(passwordSchema.safeParse("password1").success, true);
  assert.equal(passwordSchema.safeParse("pass word").success, false);

  const form = readFileSync(
    join(
      process.cwd(),
      "src/components/domain/member-gyms/MemberGymOwnerInviteAcceptForm.tsx",
    ),
    "utf8",
  );
  assert.ok(form.includes('name="passwordConfirm"'));
  assert.ok(form.includes("passwordConfirm"));
  assert.ok(form.includes("비밀번호가 일치하지 않습니다."));
  assert.ok(form.includes("passwordsMatch"));
  assert.ok(form.includes("passwordConfirm,"));

  const actions = readFileSync(
    join(process.cwd(), "src/features/gym-owner-account/actions.ts"),
    "utf8",
  );
  assert.ok(actions.includes("passwordConfirm: input.passwordConfirm"));

  const service = readFileSync(
    join(process.cwd(), "src/lib/services/gym-owner-account.service.ts"),
    "utf8",
  );
  assert.ok(service.includes("passwordConfirm: string"));
  assert.ok(
    service.includes(
      'if (input.password !== input.passwordConfirm)',
    ) ||
      service.includes(
        "if (input.password !== input.passwordConfirm)",
      ),
  );
  assert.ok(service.includes("비밀번호가 일치하지 않습니다."));

  console.log("verify:gym-owner-password-confirm: OK");
}

main();
