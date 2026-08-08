-- AlterEnum
ALTER TYPE "GymSalesCategory" ADD VALUE IF NOT EXISTS 'locker';

-- CreateTable
CREATE TABLE "GymMemberGroup" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMemberGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GymMemberGroupAssignment" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMemberGroupAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GymMemberLockerRental" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymMemberId" TEXT NOT NULL,
    "lockerLabel" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "amount" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT,
    "endedAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMemberLockerRental_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GymMemberGroup_gymId_deletedAt_idx" ON "GymMemberGroup"("gymId", "deletedAt");
CREATE INDEX "GymMemberGroup_gymId_isActive_sortOrder_idx" ON "GymMemberGroup"("gymId", "isActive", "sortOrder");
CREATE INDEX "GymMemberGroup_gymId_name_idx" ON "GymMemberGroup"("gymId", "name");

CREATE UNIQUE INDEX "GymMemberGroupAssignment_gymMemberId_groupId_key" ON "GymMemberGroupAssignment"("gymMemberId", "groupId");
CREATE INDEX "GymMemberGroupAssignment_gymId_groupId_deletedAt_idx" ON "GymMemberGroupAssignment"("gymId", "groupId", "deletedAt");
CREATE INDEX "GymMemberGroupAssignment_gymMemberId_deletedAt_idx" ON "GymMemberGroupAssignment"("gymMemberId", "deletedAt");

CREATE INDEX "GymMemberLockerRental_gymId_gymMemberId_deletedAt_idx" ON "GymMemberLockerRental"("gymId", "gymMemberId", "deletedAt");
CREATE INDEX "GymMemberLockerRental_gymMemberId_endedAt_deletedAt_idx" ON "GymMemberLockerRental"("gymMemberId", "endedAt", "deletedAt");
CREATE INDEX "GymMemberLockerRental_paymentId_idx" ON "GymMemberLockerRental"("paymentId");

ALTER TABLE "GymMemberGroup" ADD CONSTRAINT "GymMemberGroup_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymMemberGroupAssignment" ADD CONSTRAINT "GymMemberGroupAssignment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymMemberGroupAssignment" ADD CONSTRAINT "GymMemberGroupAssignment_gymMemberId_fkey" FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymMemberGroupAssignment" ADD CONSTRAINT "GymMemberGroupAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GymMemberGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymMemberLockerRental" ADD CONSTRAINT "GymMemberLockerRental_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymMemberLockerRental" ADD CONSTRAINT "GymMemberLockerRental_gymMemberId_fkey" FOREIGN KEY ("gymMemberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymMemberLockerRental" ADD CONSTRAINT "GymMemberLockerRental_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "GymMemberPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
