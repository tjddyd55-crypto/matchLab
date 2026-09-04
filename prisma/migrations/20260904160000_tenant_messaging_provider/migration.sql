-- Tenant messaging provider config (협회/체육관 Aligo credential)
CREATE TYPE "MessagingProviderOwnerType" AS ENUM ('association', 'gym');
CREATE TYPE "MessagingProviderKind" AS ENUM ('aligo');

ALTER TYPE "MatchonMessageOwnerType" ADD VALUE IF NOT EXISTS 'association';

CREATE TABLE "MessagingProviderConfig" (
    "id" TEXT NOT NULL,
    "ownerType" "MessagingProviderOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "provider" "MessagingProviderKind" NOT NULL DEFAULT 'aligo',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "loginId" TEXT,
    "apiKeyCipher" BYTEA,
    "apiKeyIv" BYTEA,
    "apiKeyAuthTag" BYTEA,
    "apiKeyKeyVer" TEXT,
    "senderPhone" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessagingProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessagingProviderConfig_ownerType_ownerId_provider_key" ON "MessagingProviderConfig"("ownerType", "ownerId", "provider");
CREATE INDEX "MessagingProviderConfig_ownerType_ownerId_idx" ON "MessagingProviderConfig"("ownerType", "ownerId");

ALTER TABLE "MessagingProviderConfig" ADD CONSTRAINT "MessagingProviderConfig_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatchonMessageDispatch" ADD COLUMN IF NOT EXISTS "organizerId" TEXT;

CREATE INDEX IF NOT EXISTS "MatchonMessageDispatch_ownerType_organizerId_createdAt_idx" ON "MatchonMessageDispatch"("ownerType", "organizerId", "createdAt");
