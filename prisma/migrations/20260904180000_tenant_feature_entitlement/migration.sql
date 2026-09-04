-- Tenant platform feature entitlement (Admin-managed per association/gym)

CREATE TYPE "PlatformFeatureTargetType" AS ENUM ('association', 'gym', 'both');
CREATE TYPE "TenantFeatureOwnerType" AS ENUM ('association', 'gym');
CREATE TYPE "TenantFeatureEntitlementSource" AS ENUM ('admin', 'plan', 'addon', 'promotion');

CREATE TABLE "PlatformFeature" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetType" "PlatformFeatureTargetType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeature_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "TenantFeatureEntitlement" (
    "id" TEXT NOT NULL,
    "ownerType" "TenantFeatureOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "source" "TenantFeatureEntitlementSource" NOT NULL DEFAULT 'admin',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantFeatureEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantFeatureEntitlement_ownerType_ownerId_featureKey_key" ON "TenantFeatureEntitlement"("ownerType", "ownerId", "featureKey");
CREATE INDEX "TenantFeatureEntitlement_ownerType_ownerId_idx" ON "TenantFeatureEntitlement"("ownerType", "ownerId");

ALTER TABLE "TenantFeatureEntitlement" ADD CONSTRAINT "TenantFeatureEntitlement_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "PlatformFeature"("key") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PlatformFeature" ("key", "name", "description", "targetType", "active", "updatedAt")
VALUES
  (
    'TENANT_MESSAGING',
    '문자 서비스',
    '협회/체육관 전용 알리고 단체 문자 발송',
    'both',
    true,
    CURRENT_TIMESTAMP
  ),
  (
    'FACE_ATTENDANCE',
    '안면인식 출석',
    '체육관 안면인식 출석 (향후 제공)',
    'gym',
    true,
    CURRENT_TIMESTAMP
  );
