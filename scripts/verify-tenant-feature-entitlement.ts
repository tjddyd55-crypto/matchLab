/**
 * Tenant feature entitlement verify — static + optional DB checks.
 *   npm run verify:tenant-feature-entitlement
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PlatformFeatureTargetType,
  TenantFeatureEntitlementSource,
  TenantFeatureOwnerType,
} from "../src/generated/prisma";
import { TENANT_FEATURE_KEYS } from "../src/lib/platform-features/tenant-feature-keys";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function assertSchema() {
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model PlatformFeature/);
  assert.match(schema, /model TenantFeatureEntitlement/);
  assert.match(schema, /enum PlatformFeatureTargetType/);
  assert.match(schema, /enum TenantFeatureOwnerType/);

  const migration = read(
    "prisma/migrations/20260904180000_tenant_feature_entitlement/migration.sql",
  );
  assert.match(migration, /INSERT INTO "PlatformFeature"/);
  assert.match(migration, /'TENANT_MESSAGING'/);
  assert.match(migration, /'FACE_ATTENDANCE'/);
  console.log("verify:tenant-feature-entitlement-schema: OK");
}

function assertMessagingSeparation() {
  const form = read("src/components/domain/messaging/MessagingProviderSettingsForm.tsx");
  assert.doesNotMatch(form, /알리고 사용/);
  assert.match(form, /messagingFeatureEnabled/);
  assert.match(form, /플랫폼 관리자 설정에 따라 결정됩니다/);

  const settings = read("src/lib/services/messaging-provider-settings.service.ts");
  assert.doesNotMatch(settings, /enabled: input\.enabled/);
  assert.match(settings, /tenantFeatureEntitlementService/);

  const resolve = read("src/lib/services/messaging-provider-settings.service.ts");
  assert.doesNotMatch(
    resolve,
    /if \(!row\?\.enabled\) return null/,
    "MessagingProviderConfig.enabled must not gate credentials",
  );

  const tenantMessaging = read("src/lib/services/tenant-messaging.service.ts");
  assert.match(tenantMessaging, /requireTenantMessaging/);
  assert.match(
    tenantMessaging,
    /문자 발송 설정이 완료되지 않았습니다/,
  );
  console.log("verify:tenant-feature-entitlement-messaging-separation: OK");
}

function assertAdminUi() {
  const assoc = read("src/components/domain/admin/AdminAssociationDetailView.tsx");
  const gym = read("src/components/domain/admin/AdminGymDetailView.tsx");
  assert.match(assoc, /platform-features/);
  assert.match(assoc, /플랫폼 기능/);
  assert.match(assoc, /AdminTenantFeaturePanel/);
  assert.match(gym, /platform-features/);
  assert.match(gym, /AdminTenantFeaturePanel/);

  const service = read("src/lib/services/tenant-feature-entitlement.service.ts");
  assert.match(service, /requireRole\(actor, \["admin"\]\)/);
  assert.match(service, /listFeaturesForTarget/);
  console.log("verify:tenant-feature-entitlement-admin-ui: OK");
}

function assertBulkSmsVisibility() {
  const gymList = read("src/components/domain/gym-members/GymMemberListWithBulkSms.tsx");
  assert.match(gymList, /messagingFeatureEnabled/);
  const memberGym = read("src/components/domain/member-gyms/MemberGymListWithBulkSms.tsx");
  assert.match(memberGym, /messagingFeatureEnabled/);
  const toolbar = read(
    "src/components/domain/applications/OrganizerApplicationsBulkToolbar.tsx",
  );
  assert.match(toolbar, /messagingFeatureEnabled/);
  console.log("verify:tenant-feature-entitlement-bulk-sms-ui: OK");
}

function assertFeatureKeys() {
  assert.equal(TENANT_FEATURE_KEYS.TENANT_MESSAGING, "TENANT_MESSAGING");
  assert.equal(TENANT_FEATURE_KEYS.FACE_ATTENDANCE, "FACE_ATTENDANCE");
  assert.equal(
    PlatformFeatureTargetType.both,
    "both",
  );
  assert.equal(TenantFeatureOwnerType.association, "association");
  assert.equal(TenantFeatureEntitlementSource.admin, "admin");
  console.log("verify:tenant-feature-entitlement-keys: OK");
}

async function assertDbIsolation() {
  if (!process.env.DATABASE_URL) {
    console.log("verify:tenant-feature-entitlement-db: SKIP (no DATABASE_URL)");
    return;
  }

  const { prisma } = await import("../src/lib/prisma");

  const features = await prisma.platformFeature.findMany({
    where: { key: { in: ["TENANT_MESSAGING", "FACE_ATTENDANCE"] } },
  });
  assert.equal(features.length, 2);

  const assocA = `verify-ent-a-${randomUUID()}`;
  const assocB = `verify-ent-b-${randomUUID()}`;
  const gymA = `verify-ent-gym-a-${randomUUID()}`;
  const gymB = `verify-ent-gym-b-${randomUUID()}`;

  try {
    await prisma.tenantFeatureEntitlement.createMany({
      data: [
        {
          ownerType: TenantFeatureOwnerType.association,
          ownerId: assocA,
          featureKey: TENANT_FEATURE_KEYS.TENANT_MESSAGING,
          enabled: true,
          source: TenantFeatureEntitlementSource.admin,
        },
        {
          ownerType: TenantFeatureOwnerType.association,
          ownerId: assocB,
          featureKey: TENANT_FEATURE_KEYS.TENANT_MESSAGING,
          enabled: false,
          source: TenantFeatureEntitlementSource.admin,
        },
        {
          ownerType: TenantFeatureOwnerType.gym,
          ownerId: gymA,
          featureKey: TENANT_FEATURE_KEYS.FACE_ATTENDANCE,
          enabled: true,
          source: TenantFeatureEntitlementSource.admin,
        },
        {
          ownerType: TenantFeatureOwnerType.gym,
          ownerId: gymB,
          featureKey: TENANT_FEATURE_KEYS.FACE_ATTENDANCE,
          enabled: false,
          source: TenantFeatureEntitlementSource.admin,
        },
      ],
    });

    const assocEnabled = await prisma.tenantFeatureEntitlement.findUnique({
      where: {
        ownerType_ownerId_featureKey: {
          ownerType: TenantFeatureOwnerType.association,
          ownerId: assocA,
          featureKey: TENANT_FEATURE_KEYS.TENANT_MESSAGING,
        },
      },
    });
    const assocDisabled = await prisma.tenantFeatureEntitlement.findUnique({
      where: {
        ownerType_ownerId_featureKey: {
          ownerType: TenantFeatureOwnerType.association,
          ownerId: assocB,
          featureKey: TENANT_FEATURE_KEYS.TENANT_MESSAGING,
        },
      },
    });
    assert.equal(assocEnabled?.enabled, true);
    assert.equal(assocDisabled?.enabled, false);

    const gymFace = await prisma.tenantFeatureEntitlement.findUnique({
      where: {
        ownerType_ownerId_featureKey: {
          ownerType: TenantFeatureOwnerType.gym,
          ownerId: gymA,
          featureKey: TENANT_FEATURE_KEYS.FACE_ATTENDANCE,
        },
      },
    });
    assert.equal(gymFace?.enabled, true);

    const gymFeatures = await prisma.platformFeature.findMany({
      where: {
        active: true,
        targetType: {
          in: [PlatformFeatureTargetType.gym, PlatformFeatureTargetType.both],
        },
      },
    });
    assert.ok(gymFeatures.some((f) => f.key === TENANT_FEATURE_KEYS.TENANT_MESSAGING));
    assert.ok(gymFeatures.some((f) => f.key === TENANT_FEATURE_KEYS.FACE_ATTENDANCE));

    const assocFeatures = await prisma.platformFeature.findMany({
      where: {
        active: true,
        targetType: {
          in: [
            PlatformFeatureTargetType.association,
            PlatformFeatureTargetType.both,
          ],
        },
      },
    });
    assert.ok(
      assocFeatures.some((f) => f.key === TENANT_FEATURE_KEYS.TENANT_MESSAGING),
    );
    assert.ok(
      !assocFeatures.some((f) => f.key === TENANT_FEATURE_KEYS.FACE_ATTENDANCE),
    );

    console.log("verify:tenant-feature-entitlement-db: OK");
  } finally {
    await prisma.tenantFeatureEntitlement.deleteMany({
      where: {
        ownerId: { in: [assocA, assocB, gymA, gymB] },
      },
    });
    await prisma.$disconnect();
  }
}

async function main() {
  assertSchema();
  assertMessagingSeparation();
  assertAdminUi();
  assertBulkSmsVisibility();
  assertFeatureKeys();
  await assertDbIsolation();
  console.log("verify:tenant-feature-entitlement: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
