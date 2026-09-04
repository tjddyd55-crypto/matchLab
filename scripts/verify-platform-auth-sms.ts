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
  assert.match(service, /classifyAligoConnectionError/);
  assert.doesNotMatch(service, /tenantFeatureEntitlementService/);
  assert.doesNotMatch(service, /messagingProviderConfigRepository/);
  console.log("verify:platform-auth-sms-service: OK");
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
