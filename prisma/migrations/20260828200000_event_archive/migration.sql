-- CreateEnum
CREATE TYPE "EventArchiveStatus" AS ENUM ('active', 'superseded');

-- CreateTable
CREATE TABLE "EventArchive" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "EventArchiveStatus" NOT NULL DEFAULT 'active',
    "eventSnapshot" JSONB NOT NULL,
    "applicantsSnapshot" JSONB NOT NULL,
    "bracketSnapshot" JSONB NOT NULL,
    "resultsSnapshot" JSONB NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventArchive_eventId_status_idx" ON "EventArchive"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventArchive_eventId_version_key" ON "EventArchive"("eventId", "version");

-- AddForeignKey
ALTER TABLE "EventArchive" ADD CONSTRAINT "EventArchive_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
