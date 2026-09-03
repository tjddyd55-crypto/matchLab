-- AlterTable
ALTER TABLE "AssociationSchedule" ADD COLUMN IF NOT EXISTS "relatedEventId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AssociationSchedule_relatedEventId_idx" ON "AssociationSchedule"("relatedEventId");

-- Partial unique: one active schedule per organizer+event
CREATE UNIQUE INDEX IF NOT EXISTS "AssociationSchedule_organizerId_relatedEventId_active_key"
ON "AssociationSchedule"("organizerId", "relatedEventId")
WHERE "deletedAt" IS NULL AND "relatedEventId" IS NOT NULL;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "AssociationSchedule" ADD CONSTRAINT "AssociationSchedule_relatedEventId_fkey" FOREIGN KEY ("relatedEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
