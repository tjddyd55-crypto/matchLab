/**
 * MATCHON phone verification / auth SMS safety verifies.
 *   npm run verify:phone-verification
 *   npm run verify:signup-phone-verification
 *   npm run verify:password-reset-phone
 *   npm run verify:sms-provider-safety
 *   npm run verify:desktop-auth-navigation
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

  console.log("verify:phone-verification ALL_PASS");
}

main();
