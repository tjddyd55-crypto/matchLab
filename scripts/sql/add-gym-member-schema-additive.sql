-- Additive-only GymMember schema (Preview/Production)
-- Keeps GymApplication / AssociationGymConnectionRequest intact

CREATE TYPE "GymMemberStatus" AS ENUM ('active', 'paused', 'withdrawn');
CREATE TYPE "GymMembershipDurationType" AS ENUM ('days', 'months', 'fixed_end');
CREATE TYPE "GymMemberSubscriptionStatus" AS ENUM ('active', 'paused', 'ended', 'cancelled');
CREATE TYPE "GymMemberPaymentMethod" AS ENUM ('cash', 'card', 'transfer', 'other');
CREATE TYPE "GymMemberPaymentStatus" AS ENUM ('paid', 'cancelled', 'refunded');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_updated';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_paused';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_resumed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_withdrawn';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_fighter_linked';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_subscription_changed';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_payment_created';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'gym_member_payment_cancelled';

ALTER TABLE "Fighter" ADD COLUMN IF NOT EXISTS "gymMemberId" TEXT;

CREATE TABLE IF NOT EXISTS "GymMember" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "email" TEXT,
    "postalCode" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GymMemberStatus" NOT NULL DEFAULT 'active',
    "primarySport" TEXT,
    "rankName" TEXT,
    "memo" TEXT,
    "smsOptOut" BOOLEAN NOT NULL DEFAULT false,
    "profileImagePath" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymMembershipPlan" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationType" "GymMembershipDurationType" NOT NULL,
    "durationValue" INTEGER,
    "price" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymMembershipPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymMemberSubscription" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "planId" TEXT,
    "planNameSnapshot" TEXT NOT NULL,
    "priceSnapshot" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "GymMemberSubscriptionStatus" NOT NULL DEFAULT 'active',
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "memo" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymMemberSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymMemberSubscriptionPause" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "pausedAt" TIMESTAMP(3) NOT NULL,
    "resumeAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "extendEndsAt" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GymMemberSubscriptionPause_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GymMemberPayment" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "GymMemberPaymentMethod" NOT NULL DEFAULT 'cash',
    "status" "GymMemberPaymentStatus" NOT NULL DEFAULT 'paid',
    "memo" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GymMemberPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GymMember_gymId_deletedAt_idx" ON "GymMember"("gymId", "deletedAt");
CREATE INDEX IF NOT EXISTS "GymMember_gymId_status_idx" ON "GymMember"("gymId", "status");
CREATE INDEX IF NOT EXISTS "GymMember_gymId_phone_idx" ON "GymMember"("gymId", "phone");
CREATE INDEX IF NOT EXISTS "GymMember_gymId_normalizedPhone_idx" ON "GymMember"("gymId", "normalizedPhone");
CREATE INDEX IF NOT EXISTS "GymMember_gymId_name_idx" ON "GymMember"("gymId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "GymMember_gymId_memberNumber_key" ON "GymMember"("gymId", "memberNumber");
CREATE INDEX IF NOT EXISTS "GymMembershipPlan_gymId_deletedAt_idx" ON "GymMembershipPlan"("gymId", "deletedAt");
CREATE INDEX IF NOT EXISTS "GymMembershipPlan_gymId_isActive_idx" ON "GymMembershipPlan"("gymId", "isActive");
CREATE INDEX IF NOT EXISTS "GymMemberSubscription_gymMemberId_status_endsAt_idx" ON "GymMemberSubscription"("gymMemberId", "status", "endsAt");
CREATE INDEX IF NOT EXISTS "GymMemberSubscription_gymId_status_idx" ON "GymMemberSubscription"("gymId", "status");
CREATE INDEX IF NOT EXISTS "GymMemberSubscriptionPause_subscriptionId_idx" ON "GymMemberSubscriptionPause"("subscriptionId");
CREATE INDEX IF NOT EXISTS "GymMemberPayment_gymMemberId_paidAt_idx" ON "GymMemberPayment"("gymMemberId", "paidAt");
CREATE INDEX IF NOT EXISTS "GymMemberPayment_gymId_paidAt_idx" ON "GymMemberPayment"("gymId", "paidAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Fighter_gymMemberId_key" ON "Fighter"("gymMemberId");
