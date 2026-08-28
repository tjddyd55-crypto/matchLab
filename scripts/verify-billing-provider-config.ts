/**
 * Billing admin provider config verify.
 *   npm run verify:billing-provider-config
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeConnectionStatus,
  maskClientKey,
  validateClientKeyForEnvironment,
  validateKeyPairConsistency,
  validateSecretKeyForEnvironment,
} from "../src/lib/billing/billing-key-validation";
import {
  decryptPiiUtf8,
  encryptPiiUtf8,
  parsePiiEncryptionKey,
} from "../src/lib/crypto/pii-aes";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const TEST_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function main() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model BillingProviderConfig/);
  assert.match(schema, /model BillingRuntimeConfig/);
  assert.match(schema, /@@unique\(\[provider, environment\]\)/);

  const mig = read(
    "prisma/migrations/20260828100000_billing_admin_provider_config/migration.sql",
  );
  assert.match(mig, /CREATE TABLE "BillingProviderConfig"/);
  assert.match(mig, /CREATE TABLE "BillingRuntimeConfig"/);
  assert.doesNotMatch(mig, /DROP TABLE/i);

  // key validation
  assert.equal(
    validateClientKeyForEnvironment("test_ck_abc", "TEST"),
    null,
  );
  assert.ok(
    validateClientKeyForEnvironment("live_ck_abc", "TEST")?.includes("TEST"),
  );
  assert.ok(
    validateSecretKeyForEnvironment("test_sk_abc", "LIVE")?.includes("LIVE"),
  );
  assert.equal(
    validateKeyPairConsistency("test_ck_x", "test_sk_y"),
    null,
  );
  assert.ok(validateKeyPairConsistency("test_ck_x", "live_sk_y"));

  assert.equal(maskClientKey("test_ck_abcdefghij"), "test_ck****ghij");

  assert.equal(computeConnectionStatus({
    clientKeyPresent: false,
    secretKeyPresent: false,
    enabled: false,
  }), "NOT_CONFIGURED");
  assert.equal(computeConnectionStatus({
    clientKeyPresent: true,
    secretKeyPresent: true,
    enabled: true,
  }), "ENABLED");

  // encryption round-trip (uses test key in memory)
  const key = parsePiiEncryptionKey(TEST_KEY_HEX);
  assert.equal(key.length, 32);
  const plain = "test_sk_secret_value_12345";
  const prev = process.env.MATCHON_PII_ENCRYPTION_KEY;
  process.env.MATCHON_PII_ENCRYPTION_KEY = TEST_KEY_HEX;
  try {
    const blob = encryptPiiUtf8(plain);
    assert.notEqual(Buffer.from(blob.cipher).toString("hex"), plain);
    assert.equal(decryptPiiUtf8(blob), plain);
  } finally {
    if (prev === undefined) delete process.env.MATCHON_PII_ENCRYPTION_KEY;
    else process.env.MATCHON_PII_ENCRYPTION_KEY = prev;
  }

  const resolver = read("src/lib/billing/billing-provider-config.ts");
  assert.match(resolver, /resolveBillingProviderConfig/);
  assert.match(resolver, /getBillingProviderCredentials/);
  assert.match(resolver, /invalidateBillingProviderConfigCache/);
  assert.match(resolver, /credentialSource/);

  const publicRoute = read("src/app/api/billing/public-config/route.ts");
  assert.match(publicRoute, /getBillingPublicConfig/);
  assert.doesNotMatch(publicRoute, /secretKey|encryptedSecret/i);

  const adminPage = read("src/app/(dashboard)/admin/billing/settings/page.tsx");
  assert.match(adminPage, /redirectUnlessDashboardRole\(actor, \["admin"\]\)/);

  const adminClient = read(
    "src/components/domain/billing/AdminBillingSettingsClient.tsx",
  );
  assert.match(adminClient, /useAppConfirmDialog/);
  assert.doesNotMatch(adminClient, /window\.confirm|alert\(/);

  const actions = read("src/features/billing/admin-settings-actions.ts");
  assert.match(actions, /saveBillingProviderCredentialsAction/);
  assert.match(actions, /deleteBillingProviderSecretAction/);
  assert.doesNotMatch(actions, /secretKey.*return/);

  const service = read("src/lib/services/admin-billing-settings.service.ts");
  assert.match(service, /encryptBillingSecret/);
  assert.match(service, /system_setting_changed/);
  assert.match(service, /secretKeyChanged/);
  assert.doesNotMatch(service, /afterData:[\s\S]*secretKeyInput/);

  const checkoutClient = read(
    "src/components/domain/billing/BillingCheckoutClient.tsx",
  );
  assert.match(checkoutClient, /온라인 결제 준비 중/);

  const nav = read("src/lib/navigation/admin-navigation.ts");
  assert.match(nav, /\/admin\/billing\/settings/);
  assert.match(nav, /결제 관리/);

  const tossEnv = read("src/lib/billing/toss-env.ts");
  assert.match(tossEnv, /resolveBillingProviderConfig/);

  console.log("verify:billing-provider-config OK");
}

main();
