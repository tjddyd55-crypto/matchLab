-- Billing admin provider config (TEST/LIVE credentials + runtime toggle)

CREATE TYPE "BillingProviderKind" AS ENUM ('NONE', 'TOSS');
CREATE TYPE "BillingProviderEnvironment" AS ENUM ('TEST', 'LIVE');

CREATE TABLE "BillingProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" "BillingProviderKind" NOT NULL,
    "environment" "BillingProviderEnvironment" NOT NULL,
    "clientKey" TEXT,
    "secretKeyCipher" BYTEA,
    "secretKeyIv" BYTEA,
    "secretKeyAuthTag" BYTEA,
    "secretKeyKeyVer" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingRuntimeConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" "BillingProviderKind" NOT NULL DEFAULT 'NONE',
    "environment" "BillingProviderEnvironment",
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRuntimeConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingProviderConfig_provider_environment_key" ON "BillingProviderConfig"("provider", "environment");

ALTER TABLE "BillingProviderConfig" ADD CONSTRAINT "BillingProviderConfig_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingRuntimeConfig" ADD CONSTRAINT "BillingRuntimeConfig_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "BillingRuntimeConfig" ("id", "provider", "environment", "enabled", "updatedAt")
VALUES ('default', 'NONE', NULL, false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
