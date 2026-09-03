/**
 * Static checks for MATCHON org billing + Revenue IA.
 *   npm run verify:matchon-subscription-billing
 *
 * Avoid importing server-only modules (tsx is not a Next server context).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getGymPortalNavGroups } from "../src/lib/navigation/gym-portal-navigation";
import { getOrganizerGlobalNavGroups } from "../src/lib/navigation/organizer-global-navigation";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertSchemaAdditive() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model BillingSubscription/);
  assert.match(schema, /gymId\s+String\?/);
  assert.match(schema, /organizerId\s+String\?/);
  assert.match(schema, /providerEnvironment\s+BillingProviderEnvironment\?/);
  assert.match(schema, /actorUserId\s+String\?/);
  assert.match(schema, /tossCustomerKey\s+String\?\s+@unique/);
  const migration = read(
    "prisma/migrations/20260903160000_billing_org_owner/migration.sql",
  );
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "gymId"/);
  assert.doesNotMatch(migration, /DROP COLUMN "userId"/);
  assert.doesNotMatch(migration, /DELETE FROM "Billing/);
  console.log("schema-additive: OK");
}

function assertIaSeparation() {
  const gym = getGymPortalNavGroups("owner");
  const revenue = gym.find((g) => g.id === "revenue");
  const matchon = gym.find((g) => g.id === "matchon");
  assert.equal(revenue?.label, "매출 관리");
  assert.ok(!revenue?.items.some((i) => i.href.includes("/billing")));
  assert.equal(matchon?.label, "MATCHON");
  assert.deepEqual(
    matchon?.items.map((i) => i.label),
    ["MATCHON 구독"],
  );
  assert.ok(!gym.some((g) => g.label === "결제·구독"));

  const assoc = getOrganizerGlobalNavGroups({ organizerType: "association" });
  assert.ok(assoc.some((g) => g.id === "matchon"));
  assert.ok(!assoc.some((g) => g.label === "결제·정산"));
  assert.ok(
    assoc
      .find((g) => g.id === "matchon")
      ?.items.some((i) => i.label === "MATCHON 구독"),
  );
  assert.ok(!assoc.some((g) => g.id === "revenue" || g.label === "매출 관리"));

  const view = read("src/components/domain/billing/BillingAccountView.tsx");
  assert.match(view, /MATCHON 구독/);
  assert.match(view, /MATCHON 서비스 이용 플랜과 결제 정보를 관리합니다/);
  assert.doesNotMatch(view, /이용권 \/ 결제관리/);
  console.log("ia-separation: OK");
}

function assertOrgOwnerCode() {
  const owner = read("src/lib/billing/org-billing-owner.ts");
  assert.match(owner, /resolveBillingOrgOwner/);
  assert.match(owner, /ensureOrgTossCustomerKey/);
  assert.match(owner, /kind: "gym"/);
  assert.match(owner, /kind: "organizer"/);

  const entitlement = read("src/lib/billing/entitlement.ts");
  assert.match(entitlement, /findLatestForOrgOrUser/);
  assert.match(entitlement, /resolveBillingOrgOwner/);

  const lifecycle = read("src/lib/services/billing-lifecycle.service.ts");
  assert.match(lifecycle, /requireBillingOrgOwner/);
  assert.match(lifecycle, /providerEnvironment/);
  assert.match(lifecycle, /ensureOrgTossCustomerKey/);

  const repo = read("src/lib/repositories/billing.repository.ts");
  assert.match(repo, /findLatestByGymId/);
  assert.match(repo, /findLatestByOrganizerId/);
  assert.match(repo, /findLatestForOrgOrUser/);
  console.log("org-owner-code: OK");
}

function assertRenewalIdempotency() {
  const renewal = read("src/lib/services/billing-renewal.service.ts");
  assert.match(renewal, /export function renewalOrderId/);
  assert.match(
    renewal,
    /return `renew_\$\{subscriptionId\}_\$\{periodStart\.toISOString\(\)\.slice\(0, 10\)\}`/,
  );
  assert.doesNotMatch(renewal, /randomUUID\(\)\.slice/);
  assert.match(renewal, /runSubscriptionBilling/);
  console.log("renewal-idempotency: OK");
}

function assertAdminToss() {
  const admin = read(
    "src/components/domain/billing/AdminBillingSettingsClient.tsx",
  );
  assert.match(admin, /연결 확인/);
  assert.match(admin, /라이브 결제를 활성화하면 실제 금액이 청구될 수 있습니다/);
  assert.match(admin, /readinessLabel/);
  const diag = read("src/lib/billing/billing-provider-diagnostics.ts");
  assert.match(diag, /formatBillingReadinessLabel/);
  assert.match(diag, /LIVE 운영 준비 완료/);
  assert.match(diag, /TEST 준비 완료/);
  console.log("admin-toss: OK");
}

function assertEnvIsolation() {
  const lifecycle = read("src/lib/services/billing-lifecycle.service.ts");
  assert.match(
    lifecycle,
    /결제 환경\(TEST\/LIVE\)이 일치하지 않습니다/,
  );
  const renewal = read("src/lib/services/billing-renewal.service.ts");
  assert.match(renewal, /providerEnvironment/);
  console.log("env-isolation: OK");
}

function main() {
  assertSchemaAdditive();
  assertIaSeparation();
  assertOrgOwnerCode();
  assertRenewalIdempotency();
  assertAdminToss();
  assertEnvIsolation();
  console.log("verify-matchon-subscription-billing: ALL OK");
}

main();
