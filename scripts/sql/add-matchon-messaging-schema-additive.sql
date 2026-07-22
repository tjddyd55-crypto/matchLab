-- Additive-only MATCHON messaging schema (Preview/Production)
-- Does not modify GymMember / Fighter / EventApplication

CREATE TYPE "MatchonMessageChannel" AS ENUM ('sms', 'lms', 'kakao_alimtalk');
CREATE TYPE "MatchonMessageSourceType" AS ENUM ('manual', 'system', 'automation', 'test');
CREATE TYPE "MatchonMessageDispatchStatus" AS ENUM ('draft', 'dry_run', 'queued', 'processing', 'completed', 'partially_failed', 'failed', 'blocked', 'cancelled');
CREATE TYPE "MatchonMessageRecipientStatus" AS ENUM ('pending', 'dry_run', 'sent', 'accepted', 'delivered', 'failed', 'excluded', 'blocked', 'cancelled');
CREATE TYPE "MatchonMessageOwnerType" AS ENUM ('platform', 'gym');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'matchon_message_dispatch_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'matchon_message_dispatch_executed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'matchon_message_template_changed';

CREATE TABLE IF NOT EXISTS "MatchonMessageTemplate" (
    "id" TEXT NOT NULL,
    "ownerType" "MatchonMessageOwnerType" NOT NULL,
    "gymId" TEXT,
    "channel" "MatchonMessageChannel" NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "kakaoTemplateCode" TEXT,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "buttons" JSONB,
    "approvedFingerprint" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchonMessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MatchonMessageDispatch" (
    "id" TEXT NOT NULL,
    "ownerType" "MatchonMessageOwnerType" NOT NULL,
    "gymId" TEXT,
    "sourceType" "MatchonMessageSourceType" NOT NULL,
    "channel" "MatchonMessageChannel" NOT NULL,
    "templateId" TEXT,
    "title" TEXT,
    "subjectSnapshot" TEXT,
    "bodySnapshot" TEXT NOT NULL,
    "requestedCount" INTEGER NOT NULL DEFAULT 0,
    "eligibleCount" INTEGER NOT NULL DEFAULT 0,
    "excludedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "status" "MatchonMessageDispatchStatus" NOT NULL DEFAULT 'draft',
    "idempotencyScope" TEXT,
    "idempotencyKey" TEXT,
    "blockedReason" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchonMessageDispatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MatchonMessageRecipient" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "gymId" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "recipientNameSnapshot" TEXT,
    "phoneSnapshot" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "channel" "MatchonMessageChannel" NOT NULL,
    "subjectSnapshot" TEXT,
    "bodySnapshot" TEXT NOT NULL,
    "templateVariablesSnapshot" JSONB,
    "status" "MatchonMessageRecipientStatus" NOT NULL DEFAULT 'pending',
    "excludedReason" TEXT,
    "providerMessageId" TEXT,
    "providerCode" TEXT,
    "providerMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchonMessageRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MatchonMessageTemplate_ownerType_gymId_deletedAt_idx" ON "MatchonMessageTemplate"("ownerType", "gymId", "deletedAt");
CREATE INDEX IF NOT EXISTS "MatchonMessageTemplate_channel_isActive_idx" ON "MatchonMessageTemplate"("channel", "isActive");
CREATE INDEX IF NOT EXISTS "MatchonMessageTemplate_isApproved_idx" ON "MatchonMessageTemplate"("isApproved");
CREATE UNIQUE INDEX IF NOT EXISTS "MatchonMessageDispatch_idempotencyScope_idempotencyKey_key" ON "MatchonMessageDispatch"("idempotencyScope", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "MatchonMessageDispatch_ownerType_gymId_createdAt_idx" ON "MatchonMessageDispatch"("ownerType", "gymId", "createdAt");
CREATE INDEX IF NOT EXISTS "MatchonMessageDispatch_status_createdAt_idx" ON "MatchonMessageDispatch"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "MatchonMessageDispatch_channel_dryRun_idx" ON "MatchonMessageDispatch"("channel", "dryRun");
CREATE INDEX IF NOT EXISTS "MatchonMessageRecipient_dispatchId_status_idx" ON "MatchonMessageRecipient"("dispatchId", "status");
CREATE INDEX IF NOT EXISTS "MatchonMessageRecipient_normalizedPhone_idx" ON "MatchonMessageRecipient"("normalizedPhone");
CREATE INDEX IF NOT EXISTS "MatchonMessageRecipient_gymId_createdAt_idx" ON "MatchonMessageRecipient"("gymId", "createdAt");
CREATE INDEX IF NOT EXISTS "MatchonMessageRecipient_referenceType_referenceId_idx" ON "MatchonMessageRecipient"("referenceType", "referenceId");
