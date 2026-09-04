/**
 * Platform auth SMS verify — static + credential separation checks.
 *   npm run verify:platform-auth-sms
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertSchema() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model PlatformMessagingProviderConfig/);
  const migration = read(
    "prisma/migrations/20260904190000_platform_messaging_provider_config/migration.sql",
  );
  assert.match(migration, /PlatformMessagingProviderConfig/);
  console.log("verify:platform-auth-sms-schema: OK");
}

function assertPlatformAuthSmsService() {
  const service = read("src/lib/services/platform-auth-sms.service.ts");
  assert.match(service, /platformAuthSmsService/);
  assert.match(service, /resolveAligoCredentials/);
  assert.match(service, /loadPhoneVerificationConfigWithCredentials/);
  assert.match(service, /getCredentialDiagnostics/);
  assert.match(
    service,
    /getMatchonPhoneVerificationRuntimeStatus\(process\.env, config\)/,
  );
  assert.match(service, /classifyAligoConnectionError/);
  assert.doesNotMatch(service, /tenantFeatureEntitlementService/);
  assert.doesNotMatch(service, /messagingProviderConfigRepository/);
  console.log("verify:platform-auth-sms-service: OK");
}

function assertRuntimeStatusMergedCredentials() {
  const {
    getMatchonPhoneVerificationRuntimeStatus,
    loadMatchonPhoneVerificationConfig,
  } = require("../src/server/phone-verification/config/matchon-phone-verification-config");

  const prodEnv = {
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    MATCHON_PHONE_VERIFICATION_ENABLED: "true",
    MATCHON_PASSWORD_RESET_PHONE_ENABLED: "true",
    MATCHON_AUTH_SMS_PROVIDER: "aligo",
    MATCHON_AUTH_SMS_DRY_RUN: "false",
    MATCHON_AUTH_SMS_ALLOW_REAL_SEND: "true",
    MATCHON_PHONE_VERIFICATION_PEPPER: "p",
  } as NodeJS.ProcessEnv;

  const envOnly = getMatchonPhoneVerificationRuntimeStatus(prodEnv);
  assert.equal(envOnly.blockingReason, "credentials_incomplete");

  const base = loadMatchonPhoneVerificationConfig(prodEnv);
  const merged = getMatchonPhoneVerificationRuntimeStatus(prodEnv, {
    ...base,
    aligo: {
      ...base.aligo,
      apiKey: "test-key",
      userId: "test-user",
      sender: "01012345678",
    },
  });
  assert.equal(merged.credentialsComplete, true);
  assert.equal(merged.productionReady, true);
  assert.equal(merged.blockingReason, null);
  console.log("verify:platform-auth-sms-merged-credentials: OK");
}

function extractServiceMethodBody(source: string, name: string): string {
  const pattern = new RegExp(
    `\\n  async ${name}\\([\\s\\S]*?(?=\\n  (?:async \\w+|peekE2eCode|getConfig\\())`,
  );
  const match = source.match(pattern);
  assert.ok(match?.[0], `missing function ${name}`);
  return match[0];
}

function assertOtpVerifyCredentialAwareConfig() {
  const phoneSvc = read(
    "src/server/phone-verification/services/matchon-phone-verification.service.ts",
  );

  for (const fn of [
    "requestSignupCode",
    "verifySignupCode",
    "requestPasswordResetCode",
    "verifyPasswordResetCode",
    "resetPasswordWithToken",
  ]) {
    const body = extractServiceMethodBody(phoneSvc, fn);
    assert.match(
      body,
      /const config = await loadSendConfig\(\)/,
      `${fn} must use credential-aware loadSendConfig()`,
    );
    assert.doesNotMatch(
      body,
      /const config = loadMatchonPhoneVerificationConfig\(\)/,
      `${fn} must not use env-only loadMatchonPhoneVerificationConfig() for OTP gate`,
    );
  }

  const consumeSignup = extractServiceMethodBody(phoneSvc, "consumeSignupToken");
  assert.doesNotMatch(
    consumeSignup,
    /assertProductionUserOtpAllowed/,
    "consumeSignupToken must not re-check SMS provider credentials",
  );
  assert.match(
    consumeSignup,
    /loadMatchonPhoneVerificationConfig\(\)/,
    "consumeSignupToken uses env config for pepper/token only",
  );

  const {
    assertProductionUserOtpAllowed,
    loadMatchonPhoneVerificationConfig,
  } = require("../src/server/phone-verification/config/matchon-phone-verification-config");

  const prodEnv = {
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT_NAME: "production",
    MATCHON_PHONE_VERIFICATION_ENABLED: "true",
    MATCHON_PASSWORD_RESET_PHONE_ENABLED: "true",
    MATCHON_AUTH_SMS_PROVIDER: "aligo",
    MATCHON_AUTH_SMS_DRY_RUN: "false",
    MATCHON_AUTH_SMS_ALLOW_REAL_SEND: "true",
    MATCHON_PHONE_VERIFICATION_PEPPER: "p",
  } as NodeJS.ProcessEnv;

  const base = loadMatchonPhoneVerificationConfig(prodEnv);
  const dbMerged = {
    ...base,
    aligo: {
      ...base.aligo,
      apiKey: "db-only-key",
      userId: "db-only-user",
      sender: "01012345678",
    },
  };

  assert.throws(
    () => assertProductionUserOtpAllowed(base, prodEnv),
    /credentials_incomplete/,
  );
  assert.doesNotThrow(() => assertProductionUserOtpAllowed(dbMerged, prodEnv));

  console.log("verify:platform-auth-sms-otp-verify-gate: OK");
}

function assertAdminUi() {
  const page = read("src/app/(dashboard)/admin/platform-settings/messaging/page.tsx");
  assert.match(page, /AdminPlatformMessagingSettingsClient/);
  const nav = read("src/lib/navigation/admin-navigation.ts");
  assert.match(nav, /platform-settings\/messaging/);
  assert.match(nav, /플랫폼 설정/);
  console.log("verify:platform-auth-sms-admin-ui: OK");
}

function assertCredentialSeparation() {
  const tenantMessaging = read("src/lib/services/tenant-messaging.service.ts");
  assert.match(tenantMessaging, /requireTenantMessaging/);
  assert.doesNotMatch(tenantMessaging, /PlatformMessagingProviderConfig/);
  assert.doesNotMatch(tenantMessaging, /platformAuthSmsService/);

  const phoneSvc = read(
    "src/server/phone-verification/services/matchon-phone-verification.service.ts",
  );
  assert.match(phoneSvc, /platformAuthSmsService/);
  assert.doesNotMatch(phoneSvc, /requireTenantMessaging/);
  assert.doesNotMatch(phoneSvc, /MessagingProviderConfig/);

  const authProvider = read(
    "src/server/phone-verification/providers/matchon-auth-aligo-sms-provider.ts",
  );
  assert.match(authProvider, /MatchonAligoHttpTransport/);
  console.log("verify:platform-auth-sms-separation: OK");
}

function assertSmsCopy() {
  const phoneSvc = read(
    "src/server/phone-verification/services/matchon-phone-verification.service.ts",
  );
  assert.match(phoneSvc, /회원가입 인증번호는/);
  assert.match(phoneSvc, /비밀번호 재설정 인증번호는/);
  console.log("verify:platform-auth-sms-copy: OK");
}

function assertTenantEntitlementIntact() {
  const keys = read("src/lib/platform-features/tenant-feature-keys.ts");
  assert.match(keys, /TENANT_MESSAGING/);
  assert.match(keys, /FACE_ATTENDANCE/);
  const form = read("src/components/domain/messaging/MessagingProviderSettingsForm.tsx");
  assert.doesNotMatch(form, /알리고 사용/);
  console.log("verify:platform-auth-sms-tenant-entitlement: OK");
}

async function assertDbModel() {
  if (!process.env.DATABASE_URL) {
    console.log("verify:platform-auth-sms-db: SKIP (no DATABASE_URL)");
    return;
  }
  const { prisma } = await import("../src/lib/prisma");
  try {
    const row = await prisma.platformMessagingProviderConfig.findUnique({
      where: { id: "default" },
    });
    assert.ok(row === null || row.provider === "aligo");
    console.log("verify:platform-auth-sms-db: OK");
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  assertSchema();
  assertPlatformAuthSmsService();
  assertRuntimeStatusMergedCredentials();
  assertOtpVerifyCredentialAwareConfig();
  assertAdminUi();
  assertCredentialSeparation();
  assertSmsCopy();
  assertTenantEntitlementIntact();
  await assertDbModel();
  console.log("verify:platform-auth-sms: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
