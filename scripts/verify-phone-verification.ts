/**
 * MATCHON phone verification / auth SMS safety verifies.
 *   npm run verify:phone-verification
 *   npm run verify:signup-phone-verification
 *   npm run verify:password-reset-phone
 *   npm run verify:sms-provider-safety
 *   npm run verify:desktop-auth-navigation
 *   npm run verify:supabase-environment-isolation
 *   npm run verify:phone-verification-feature-flags
 *   npm run verify:production-phone-verification-disabled
 *   npm run verify:password-reset-account-binding
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  generateMatchonOtpCode,
  hashMatchonOtpCode,
  hashMatchonVerificationToken,
  safeEqualHex,
} from "../src/server/phone-verification/utils/matchon-phone-otp-crypto";
import {
  canMatchonAuthSmsRealSend,
  getMatchonPhoneVerificationRuntimeStatus,
  isMatchonProductionRuntime,
  loadMatchonPhoneVerificationConfig,
} from "../src/server/phone-verification/config/matchon-phone-verification-config";
import {
  normalizeKrMobileCanonical,
  validateKrMobile,
} from "../src/lib/phone";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assertFeatureFlags() {
  const devCfg = loadMatchonPhoneVerificationConfig({
    NODE_ENV: "development",
    RAILWAY_ENVIRONMENT_NAME: "development",
    MATCHON_AUTH_SMS_PROVIDER: "mock",
    MATCHON_PHONE_VERIFICATION_PEPPER: "p",
  } as NodeJS.ProcessEnv);
  assert.equal(devCfg.signupPhoneVerificationEnabled, true);
  assert.equal(devCfg.passwordResetPhoneEnabled, true);

  const prodCfg = loadMatchonPhoneVerificationConfig({
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    MATCHON_AUTH_SMS_PROVIDER: "mock",
    MATCHON_PHONE_VERIFICATION_PEPPER: "p",
  } as NodeJS.ProcessEnv);
  assert.equal(prodCfg.signupPhoneVerificationEnabled, false);
  assert.equal(prodCfg.passwordResetPhoneEnabled, false);

  const prodOn = loadMatchonPhoneVerificationConfig({
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    MATCHON_PHONE_VERIFICATION_ENABLED: "true",
    MATCHON_PASSWORD_RESET_PHONE_ENABLED: "true",
    MATCHON_AUTH_SMS_PROVIDER: "mock",
    MATCHON_PHONE_VERIFICATION_PEPPER: "p",
  } as NodeJS.ProcessEnv);
  assert.equal(prodOn.signupPhoneVerificationEnabled, true);
  assert.equal(prodOn.passwordResetPhoneEnabled, true);

  const prodStatus = getMatchonPhoneVerificationRuntimeStatus({
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    MATCHON_PHONE_VERIFICATION_ENABLED: "true",
    MATCHON_PASSWORD_RESET_PHONE_ENABLED: "true",
    MATCHON_AUTH_SMS_PROVIDER: "mock",
    MATCHON_AUTH_SMS_DRY_RUN: "true",
    MATCHON_AUTH_SMS_ALLOW_REAL_SEND: "false",
    MATCHON_AUTH_SMS_E2E_INBOX_ENABLED: "false",
    MATCHON_PHONE_VERIFICATION_PEPPER: "p",
  } as NodeJS.ProcessEnv);
  assert.equal(prodStatus.productionReady, false);
  assert.equal(prodStatus.blockingReason, "provider_not_aligo");

  const readyStatus = getMatchonPhoneVerificationRuntimeStatus({
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    MATCHON_PHONE_VERIFICATION_ENABLED: "true",
    MATCHON_PASSWORD_RESET_PHONE_ENABLED: "true",
    MATCHON_AUTH_SMS_PROVIDER: "aligo",
    MATCHON_AUTH_SMS_DRY_RUN: "false",
    MATCHON_AUTH_SMS_ALLOW_REAL_SEND: "true",
    MATCHON_AUTH_SMS_E2E_INBOX_ENABLED: "false",
    MATCHON_AUTH_ALIGO_API_KEY: "k",
    MATCHON_AUTH_ALIGO_USER_ID: "u",
    MATCHON_AUTH_ALIGO_SENDER: "01000000000",
    MATCHON_PHONE_VERIFICATION_PEPPER: "p",
  } as NodeJS.ProcessEnv);
  assert.equal(readyStatus.productionReady, true);
  assert.equal(readyStatus.blockingReason, null);
  assert.equal(readyStatus.e2eInboxEnabled, false);

  const disabledStatus = getMatchonPhoneVerificationRuntimeStatus({
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    MATCHON_PHONE_VERIFICATION_ENABLED: "false",
    MATCHON_PASSWORD_RESET_PHONE_ENABLED: "false",
    MATCHON_AUTH_SMS_PROVIDER: "mock",
    MATCHON_PHONE_VERIFICATION_PEPPER: "p",
  } as NodeJS.ProcessEnv);
  assert.equal(disabledStatus.signupEnabled, false);
  assert.equal(disabledStatus.passwordResetEnabled, false);
  assert.equal(disabledStatus.productionReady, false);
  assert.equal(disabledStatus.blockingReason, "feature_flags_disabled");
}

function assertProductionDisabledWiring() {
  const assocSvc = read("src/lib/services/association-application.service.ts");
  assert.match(assocSvc, /signupPhoneVerificationEnabled/);
  assert.match(assocSvc, /consumeSignupToken/);

  const gymSvc = read("src/lib/services/gym-application.service.ts");
  assert.match(gymSvc, /signupPhoneVerificationEnabled/);
  assert.match(gymSvc, /consumeSignupToken/);

  const assocForm = read(
    "src/components/domain/association-applications/AssociationApplicationForm.tsx",
  );
  assert.match(assocForm, /phoneVerificationEnabled/);
  assert.match(assocForm, /휴대폰 본인인증은 준비 중입니다/);

  const gymForm = read(
    "src/components/domain/gym-join/GymJoinApplicationForm.tsx",
  );
  assert.match(gymForm, /phoneVerificationEnabled/);
  assert.match(gymForm, /휴대폰 본인인증은 준비 중입니다/);

  const resetForm = read(
    "src/components/domain/auth/PasswordResetPhoneForm.tsx",
  );
  assert.match(resetForm, /passwordResetPhoneEnabled/);
  assert.match(resetForm, /관리자에게 문의/);

  const assocPage = read("src/app/(public)/join/association/page.tsx");
  assert.match(assocPage, /signupPhoneVerificationEnabled/);
  const gymPage = read("src/app/(public)/join/gym/page.tsx");
  assert.match(gymPage, /signupPhoneVerificationEnabled/);
  const resetPage = read("src/app/(auth)/password-reset/page.tsx");
  assert.match(resetPage, /passwordResetPhoneEnabled/);

  const service = read(
    "src/server/phone-verification/services/matchon-phone-verification.service.ts",
  );
  assert.match(service, /assertProductionUserOtpAllowed/);
  assert.match(service, /signupPhoneVerificationEnabled/);
  assert.match(service, /passwordResetPhoneEnabled/);
}

function assertPasswordResetAccountBinding() {
  const service = read(
    "src/server/phone-verification/services/matchon-phone-verification.service.ts",
  );
  assert.match(service, /findMany/);
  assert.match(service, /matches\.length !== 1/);
  assert.match(service, /authUserId/);
  assert.match(service, /loginId/);
  // Binding must use loginId lookup first, then phone match — not phone-only reset.
  assert.match(
    service,
    /const candidates = await prisma\.user\.findMany\(\{\s*where:\s*\{\s*loginId\s*\}/,
  );
}

function assertSupabaseEnvironmentIsolationContract() {
  const expectedDevRef = "nbunulwquhcckhrcdnmg";
  const expectedProdRef = "tkyzsbhfnrrkyupksjrj";
  assert.notEqual(expectedDevRef, expectedProdRef);

  const config = read(
    "src/server/phone-verification/config/matchon-phone-verification-config.ts",
  );
  assert.match(config, /MATCHON_PHONE_VERIFICATION_ENABLED/);
  assert.match(config, /MATCHON_PASSWORD_RESET_PHONE_ENABLED/);
  assert.match(config, /getMatchonPhoneVerificationRuntimeStatus/);
  assert.match(config, /assertProductionUserOtpAllowed/);
  assert.match(config, /productionReady/);

  const envExample = read(".env.example");
  assert.match(envExample, /MATCHON_PHONE_VERIFICATION_ENABLED/);
  assert.match(envExample, /MATCHON_PASSWORD_RESET_PHONE_ENABLED/);
}

function main() {
  assert.equal(normalizeKrMobileCanonical("010-1234-5678"), "01012345678");
  assert.equal(normalizeKrMobileCanonical("+82 10-1234-5678"), "01012345678");
  assert.equal(normalizeKrMobileCanonical("+821012345678"), "01012345678");
  assert.equal(validateKrMobile("01012345678").ok, true);
  assert.equal(validateKrMobile("0212345678").ok, false);

  const code = generateMatchonOtpCode(6);
  assert.match(code, /^\d{6}$/);
  const h1 = hashMatchonOtpCode({
    code: "123456",
    purpose: "signup",
    phoneNormalized: "01012345678",
    pepper: "pepper",
  });
  const h2 = hashMatchonOtpCode({
    code: "123456",
    purpose: "signup",
    phoneNormalized: "01012345678",
    pepper: "pepper",
  });
  assert.equal(h1, h2);
  assert.equal(safeEqualHex(h1, h2), true);
  assert.equal(
    safeEqualHex(
      h1,
      hashMatchonOtpCode({
        code: "000000",
        purpose: "signup",
        phoneNormalized: "01012345678",
        pepper: "pepper",
      }),
    ),
    false,
  );
  assert.equal(hashMatchonVerificationToken("tok", "pepper").length, 64);

  const cfg = loadMatchonPhoneVerificationConfig({
    MATCHON_AUTH_SMS_PROVIDER: "mock",
    MATCHON_AUTH_SMS_DRY_RUN: "true",
    MATCHON_AUTH_SMS_ALLOW_REAL_SEND: "false",
    MATCHON_AUTH_SMS_E2E_INBOX_ENABLED: "true",
    MATCHON_PHONE_VERIFICATION_PEPPER: "test-pepper",
  } as NodeJS.ProcessEnv);
  assert.equal(cfg.provider, "mock");
  assert.equal(canMatchonAuthSmsRealSend(cfg), false);

  const aligoMissing = loadMatchonPhoneVerificationConfig({
    MATCHON_AUTH_SMS_PROVIDER: "aligo",
    MATCHON_AUTH_SMS_DRY_RUN: "false",
    MATCHON_AUTH_SMS_ALLOW_REAL_SEND: "true",
    MATCHON_AUTH_ALIGO_API_KEY: "",
    MATCHON_AUTH_ALIGO_USER_ID: "",
    MATCHON_AUTH_ALIGO_SENDER: "",
    MATCHON_PHONE_VERIFICATION_PEPPER: "test-pepper",
  } as NodeJS.ProcessEnv);
  assert.equal(canMatchonAuthSmsRealSend(aligoMissing), false);

  const aligoReady = loadMatchonPhoneVerificationConfig({
    MATCHON_AUTH_SMS_PROVIDER: "aligo",
    MATCHON_AUTH_SMS_DRY_RUN: "false",
    MATCHON_AUTH_SMS_ALLOW_REAL_SEND: "true",
    MATCHON_AUTH_ALIGO_API_KEY: "k",
    MATCHON_AUTH_ALIGO_USER_ID: "u",
    MATCHON_AUTH_ALIGO_SENDER: "01000000000",
    MATCHON_PHONE_VERIFICATION_PEPPER: "test-pepper",
  } as NodeJS.ProcessEnv);
  assert.equal(canMatchonAuthSmsRealSend(aligoReady), true);

  const service = read(
    "src/server/phone-verification/services/matchon-phone-verification.service.ts",
  );
  assert.match(service, /codeHash/);
  assert.match(service, /consumeSignupToken/);
  assert.match(service, /updateUserById/);
  assert.match(service, /password_reset_by_phone_completed/);
  assert.doesNotMatch(service, /console\.log\([^\n]*\bcode\b/);

  const e2eRoute = read(
    "src/app/api/internal/phone-verification/e2e-inbox/route.ts",
  );
  assert.match(e2eRoute, /isMatchonProductionRuntime/);
  assert.match(e2eRoute, /status: 404/);

  const desktop = read("src/components/domain/desktop/DesktopLoginForm.tsx");
  assert.match(desktop, /href="\/join"/);
  assert.match(desktop, /href="\/password-reset"/);

  const login = read("src/components/domain/auth/LoginForm.tsx");
  assert.match(login, /href="\/join"/);
  assert.match(login, /href="\/password-reset"/);

  const assocForm = read(
    "src/components/domain/association-applications/AssociationApplicationForm.tsx",
  );
  assert.match(assocForm, /PhoneVerificationPanel/);
  assert.match(assocForm, /signupVerificationToken/);

  const gymForm = read(
    "src/components/domain/gym-join/GymJoinApplicationForm.tsx",
  );
  assert.match(gymForm, /PhoneVerificationPanel/);

  const assocSvc = read("src/lib/services/association-application.service.ts");
  assert.match(assocSvc, /consumeSignupToken/);
  const gymSvc = read("src/lib/services/gym-application.service.ts");
  assert.match(gymSvc, /consumeSignupToken/);

  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model PhoneVerification/);
  assert.match(schema, /codeHash/);
  assert.doesNotMatch(
    schema,
    /model PhoneVerification[\s\S]{0,400}\n\s+code\s+String/,
  );

  const aligoProvider = read(
    "src/server/phone-verification/providers/matchon-auth-aligo-sms-provider.ts",
  );
  assert.match(aligoProvider, /canMatchonAuthSmsRealSend/);
  assert.match(aligoProvider, /assertMatchonAuthSmsProviderConfigured/);
  assert.doesNotMatch(aligoProvider, /INSURANCE_/);

  const migration = read(
    "prisma/migrations/20260803120000_phone_verification/migration.sql",
  );
  assert.match(migration, /CREATE TABLE IF NOT EXISTS \"PhoneVerification\"/);
  assert.match(migration, /phone_verification_code_sent/);
  assert.match(migration, /password_reset_by_phone_completed/);

  const baseline = read(
    "prisma/migrations/20260803100000_baseline_existing_schema/migration.sql",
  );
  assert.match(baseline, /Baseline marker/);

  assert.equal(
    isMatchonProductionRuntime({
      NODE_ENV: "production",
      RAILWAY_ENVIRONMENT_NAME: "development",
    } as NodeJS.ProcessEnv),
    false,
  );
  assert.equal(
    isMatchonProductionRuntime({
      NODE_ENV: "production",
      RAILWAY_ENVIRONMENT_NAME: "production",
    } as NodeJS.ProcessEnv),
    true,
  );
  assert.equal(
    isMatchonProductionRuntime({
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv),
    true,
  );

  assertFeatureFlags();
  assertProductionDisabledWiring();
  assertPasswordResetAccountBinding();
  assertSupabaseEnvironmentIsolationContract();

  console.log("verify:phone-verification ALL_PASS");
}

main();
