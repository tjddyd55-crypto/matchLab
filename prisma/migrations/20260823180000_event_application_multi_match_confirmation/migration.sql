-- AlterTable: EventApplication multi-match confirmation (organizer-only)
ALTER TABLE "EventApplication" ADD COLUMN "multiMatchConfirmedAt" TIMESTAMP(3);
ALTER TABLE "EventApplication" ADD COLUMN "multiMatchConfirmedByUserId" TEXT;
ALTER TABLE "EventApplication" ADD COLUMN "multiMatchConfirmedSignature" TEXT;
