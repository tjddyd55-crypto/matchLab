/**
 * 체육관 독립 가입 폼 — 대표자 연락처 OTP·필드 정리·내부 매핑 정적 검증.
 *   npm run verify:gym-signup-phone-verification
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function main() {
  const form = read("src/components/domain/gym-join/GymJoinApplicationForm.tsx");
  const loginIdField = read("src/components/domain/auth/RequestedLoginIdField.tsx");
  const phonePanel = read(
    "src/components/domain/phone-verification/PhoneVerificationPanel.tsx",
  );
  const gymSvc = read("src/lib/services/gym-application.service.ts");
  const gymActions = read("src/features/gym-applications/actions.ts");
  const resetForm = read("src/components/domain/auth/PasswordResetPhoneForm.tsx");
  const phoneSvc = read(
    "src/server/phone-verification/services/matchon-phone-verification.service.ts",
  );

  // Account labels
  assert.match(loginIdField, /아이디/);
  assert.doesNotMatch(loginIdField, /희망 로그인 아이디/);
  assert.match(form, /비밀번호 \*/);
  assert.match(form, /비밀번호 확인 \*/);

  // Removed manager fields from gym signup UI
  assert.doesNotMatch(form, /담당자명/);
  assert.doesNotMatch(form, /개인 연락처/);
  assert.doesNotMatch(form, /희망 로그인/);

  // Representative phone + OTP
  assert.match(form, /phoneLabel="대표자 연락처"/);
  assert.match(form, /PhoneVerificationPanel/);
  assert.match(form, /signupVerificationToken/);
  assert.match(form, /대표자 연락처 인증을 완료한 후 제출해 주세요/);
  assert.match(phonePanel, /resetVerificationLocal/);
  assert.match(phonePanel, /✓ 인증 완료/);

  // Field order: representative → phone verify → address → email
  assert.match(
    form,
    /대표자명 \*[\s\S]*PhoneVerificationPanel[\s\S]*AddressSearchField[\s\S]*이메일 주소/,
  );

  // Email required in gym info section
  assert.match(form, /label="이메일 주소"/);
  assert.match(form, /type="email"\s+required/);

  // Business number + sports
  assert.match(form, /사업자등록번호/);
  assert.match(form, /운영종목 \*/);
  assert.match(form, /운영 종목을 1개 이상 선택해 주세요/);

  // Internal mapping: contactName / phone from representative
  assert.match(form, /contactName[\s\S]*representativeName/);
  assert.match(gymActions, /contactName.*representativeName/);
  assert.match(gymSvc, /contactName:[\s\S]*representativeName/);
  assert.match(gymSvc, /phone: input\.phone\?\.trim\(\) \|\| mobilePhoneNormalized/);
  assert.match(gymSvc, /대표자 연락처/);
  assert.match(gymSvc, /consumeSignupToken/);
  assert.match(gymSvc, /accountType: "gym"/);

  // Platform auth SMS — not tenant messaging gate
  assert.doesNotMatch(gymSvc, /requireTenantMessaging/);
  assert.doesNotMatch(gymSvc, /TENANT_MESSAGING/);
  assert.doesNotMatch(form, /requireTenantMessaging/);

  // Password reset labels (same phone SSOT for gym accounts)
  assert.match(resetForm, /아이디 \*/);
  assert.match(resetForm, /연락처 \*/);
  assert.match(resetForm, /비밀번호 변경/);
  assert.match(resetForm, /verifiedLoginId/);
  assert.match(resetForm, /verifiedPhone/);

  // Password reset account binding
  assert.match(phoneSvc, /password_reset/);
  assert.match(phoneSvc, /loginId/);
  assert.match(phoneSvc, /matches\.length !== 1/);

  // OTP verify must use DB credential-aware config (not env-only gate)
  assert.match(phoneSvc, /verifySignupCode[\s\S]*?const config = await loadSendConfig\(\)/);
  assert.match(
    phoneSvc,
    /verifyPasswordResetCode[\s\S]*?const config = await loadSendConfig\(\)/,
  );

  console.log("verify:gym-signup-phone-verification: OK");
}

main();
