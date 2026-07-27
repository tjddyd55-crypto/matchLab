/**
 * 선수 계정 설정·비밀번호 재설정 링크 계약 검증 (정적).
 * package.json 여러 alias가 이 스크립트를 공유한다.
 *
 *   npm run verify:fighter-account-setup-token
 *   npm run verify:fighter-account-setup-login-id
 *   npm run verify:fighter-account-setup-password
 *   npm run verify:fighter-account-setup-existing-user
 *   npm run verify:fighter-account-setup-gym-scope
 *   npm run verify:fighter-password-reset-link
 *   npm run verify:fighter-password-reset-self-service
 *   npm run verify:fighter-password-reset-security
 *   npm run verify:fighter-login-id-unique
 *   npm run verify:fighter-account-token-privacy
 *   npm run verify:fighter-account-mobile-layout
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  const path = join(root, rel);
  assert.ok(existsSync(path), `missing: ${rel}`);
  return readFileSync(path, "utf8");
}

function assertIncludes(src: string, needle: string, label: string) {
  assert.ok(src.includes(needle), `${label}: expected to include ${JSON.stringify(needle)}`);
}

function assertNotIncludes(src: string, needle: string, label: string) {
  assert.equal(
    src.includes(needle),
    false,
    `${label}: must not include ${JSON.stringify(needle)}`,
  );
}

function main() {
  const focus = process.argv[2] ?? "all";

  const token = read("src/lib/fighter-account/token.ts");
  const rateLimit = read("src/lib/fighter-account/rate-limit.ts");
  const service = read("src/lib/services/fighter-account-setup.service.ts");
  const actions = read("src/features/fighter-account/actions.ts");
  const panel = read("src/components/domain/fighters/GymFighterAccountPanel.tsx");
  const setupForm = read(
    "src/components/domain/fighters/FighterAccountSetupForm.tsx",
  );
  const resetForm = read(
    "src/components/domain/fighters/FighterPasswordResetForm.tsx",
  );
  const setupPage = read(
    "src/app/(public)/fighter/account/setup/[token]/page.tsx",
  );
  const resetPage = read(
    "src/app/(public)/fighter/password/reset/[token]/page.tsx",
  );
  const forgotPage = read(
    "src/app/(public)/fighter/forgot-password/page.tsx",
  );
  const loginForm = read("src/components/domain/auth/LoginForm.tsx");
  const schema = read("prisma/schema.prisma");
  const fighterAccount = read("src/lib/services/fighter-account.service.ts");

  const checks: Record<string, () => void> = {
    "setup-token": () => {
      assertIncludes(token, "FIGHTER_ACCOUNT_SETUP_TTL_MS", "token ttl");
      assertIncludes(token, "hashFighterAccountToken", "token hash");
      assertIncludes(token, "buildFighterAccountSetupUrl", "setup url");
      assertIncludes(service, "createSetupLink", "createSetupLink");
      assertIncludes(service, "revokeSetupLink", "revokeSetupLink");
      assertIncludes(service, "tokenHash", "store hash");
      assertIncludes(service, "revokeActiveSetupTokens", "revoke previous");
      assertIncludes(schema, "model FighterAccountSetupToken", "schema model");
      assertNotIncludes(service, "console.log(rawToken", "no raw log");
      assertNotIncludes(service, "console.log(token)", "no token log");
    },
    "setup-login-id": () => {
      assertIncludes(setupForm, "중복확인", "duplicate check button");
      assertIncludes(setupForm, "checkFighterAccountLoginIdAction", "check action");
      assertIncludes(setupForm, "loginIdReady", "loginIdReady");
      assertIncludes(actions, "checkFighterLoginIdLookupRateLimit", "rate limit");
      assertIncludes(service, "isLoginIdAvailable", "availability");
      assertIncludes(service, "loginIdSchema", "validator");
    },
    "setup-password": () => {
      assertIncludes(setupForm, "passwordConfirm", "password confirm");
      assertIncludes(setupForm, "비밀번호 확인", "confirm label");
      assertIncludes(service, "passwordSchema", "password schema");
      assertIncludes(service, "비밀번호는 아이디와 같을 수 없습니다", "no same as id");
      assertIncludes(service, "mustChangePassword: false", "no forced change");
    },
    "setup-existing-user": () => {
      assertIncludes(service, "existing_user", "existing user mode");
      assertIncludes(service, "loginIdChanged", "optional loginId change");
      assertIncludes(service, "updateSupabaseCredentials", "update auth");
      assertIncludes(setupForm, "existingLoginId", "existing loginId prop");
    },
    "setup-gym-scope": () => {
      assertIncludes(service, "requireGymOwner", "gym owner");
      assertIncludes(service, "findActiveGymHistory", "affiliation");
      assertIncludes(service, "requireRole(actor, [\"gym\", \"admin\"])", "roles");
      assertIncludes(
        service,
        "이 선수는 현재 체육관 소속이 아닙니다",
        "scope message",
      );
    },
    "password-reset-link": () => {
      assertIncludes(token, "FIGHTER_PASSWORD_RESET_TTL_MS", "reset ttl");
      assertIncludes(token, "buildFighterPasswordResetUrl", "reset url");
      assertIncludes(service, "createPasswordResetLink", "create reset");
      assertIncludes(service, "gym_admin_link", "request source");
      assertIncludes(panel, "비밀번호 재설정 링크 만들기", "panel button");
      assertIncludes(schema, "model FighterPasswordResetToken", "schema");
      assertNotIncludes(panel, "temporaryPassword", "no temp password");
      assertNotIncludes(panel, "resetGymFighterPasswordAction", "no old reset");
      assertNotIncludes(panel, "provisionGymFighterAccountAction", "no provision");
    },
    "password-reset-self-service": () => {
      assertIncludes(forgotPage, "체육관에 비밀번호 재설정 링크를 요청", "guide");
      assertIncludes(forgotPage, "/login", "back to login");
      assertIncludes(loginForm, "/fighter/forgot-password", "login link");
      assertIncludes(loginForm, "비밀번호 찾기", "find password label");
      assertNotIncludes(forgotPage, "guardianPhone", "no phone field");
      assertNotIncludes(forgotPage, "name+phone", "no name+phone reset");
      assert.equal(
        existsSync(join(root, "src/lib/services/fighter-otp.service.ts")),
        false,
        "no otp service yet",
      );
      assertNotIncludes(forgotPage, "completePasswordReset(", "no direct reset");
    },
    "password-reset-security": () => {
      assertIncludes(service, "completePasswordReset", "complete reset");
      assertIncludes(service, "revokeActiveResetTokens", "revoke others");
      assertIncludes(actions, "checkFighterResetCompleteRateLimit", "rate limit");
      assertIncludes(resetForm, "passwordConfirm", "confirm");
      assertNotIncludes(service, "temporaryPassword", "no temp in setup svc");
      assertNotIncludes(resetPage, "fighter.phone", "no phone leak");
    },
    "login-id-unique": () => {
      assertIncludes(service, "isLoginIdTaken", "unique check");
      assertIncludes(service, "loginIdToAuthEmail", "auth email unique");
      assertIncludes(actions, "checkFighterAccountLoginIdAction", "action");
      assertIncludes(rateLimit, "checkFighterLoginIdLookupRateLimit", "rl");
    },
    "token-privacy": () => {
      assertIncludes(token, "hashFighterAccountToken", "hash helper");
      assertIncludes(service, "hashFighterAccountToken", "hash on create");
      assertNotIncludes(service, "token: rawToken", "audit no raw");
      assertNotIncludes(service, "password: input.password", "audit no password");
      assertIncludes(service, "tokenHash", "hash only stored");
      assertIncludes(panel, "비밀번호는 표시되지 않습니다", "ui privacy");
      assertNotIncludes(panel, "generateTemporaryPassword", "no temp gen");
    },
    "mobile-layout": () => {
      assertIncludes(setupPage, "max-w-md", "setup mobile width");
      assertIncludes(resetPage, "max-w-md", "reset mobile width");
      assertIncludes(forgotPage, "max-w-md", "forgot mobile width");
      assertIncludes(setupForm, "text-base", "16px inputs");
      assertIncludes(setupForm, "h-11", "touch height");
      assertIncludes(resetForm, "h-11", "reset touch height");
      assertIncludes(setupForm, "window.location.assign", "no refresh hang");
      assertNotIncludes(setupForm, "router.refresh()", "no refresh");
    },
  };

  const aliasMap: Record<string, string[]> = {
    all: Object.keys(checks),
    "setup-token": ["setup-token"],
    "setup-login-id": ["setup-login-id"],
    "setup-password": ["setup-password"],
    "setup-existing-user": ["setup-existing-user"],
    "setup-gym-scope": ["setup-gym-scope"],
    "password-reset-link": ["password-reset-link"],
    "password-reset-self-service": ["password-reset-self-service"],
    "password-reset-security": ["password-reset-security"],
    "login-id-unique": ["login-id-unique"],
    "token-privacy": ["token-privacy"],
    "mobile-layout": ["mobile-layout"],
  };

  // npm script name → focus key
  const npmAlias: Record<string, string> = {
    "verify:fighter-account-setup-token": "setup-token",
    "verify:fighter-account-setup-login-id": "setup-login-id",
    "verify:fighter-account-setup-password": "setup-password",
    "verify:fighter-account-setup-existing-user": "setup-existing-user",
    "verify:fighter-account-setup-gym-scope": "setup-gym-scope",
    "verify:fighter-password-reset-link": "password-reset-link",
    "verify:fighter-password-reset-self-service": "password-reset-self-service",
    "verify:fighter-password-reset-security": "password-reset-security",
    "verify:fighter-login-id-unique": "login-id-unique",
    "verify:fighter-account-token-privacy": "token-privacy",
    "verify:fighter-account-mobile-layout": "mobile-layout",
  };

  const resolved =
    npmAlias[focus] ??
    (aliasMap[focus] ? focus : focus.replace(/^verify:fighter-account-/, "").replace(/^verify:fighter-/, ""));

  const keys = aliasMap[resolved] ?? aliasMap.all;
  for (const key of keys) {
    const fn = checks[key];
    assert.ok(fn, `unknown check: ${key}`);
    fn();
  }

  // 공통: 구 임시비번 패널 경로 제거
  assertNotIncludes(panel, "temporaryPassword", "panel no temp password");
  // fighter-account.service의 resetFighterPassword는 유지(호환)하되 패널에서 미사용
  assertIncludes(fighterAccount, "resetFighterPassword", "compat method kept");

  console.log(`verify:fighter-account-setup (${keys.join(",")}): OK`);
}

main();
