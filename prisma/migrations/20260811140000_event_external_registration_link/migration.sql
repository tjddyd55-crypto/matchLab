-- Additive: Event external gym multi-registration public link
CREATE TYPE "EventExternalRegistrationLinkStatus" AS ENUM ('active', 'revoked');

CREATE TABLE "EventExternalRegistrationLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "status" "EventExternalRegistrationLinkStatus" NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "lastSubmittedAt" TIMESTAMP(3),
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "athleteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventExternalRegistrationLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventExternalRegistrationSubmission" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "clientSubmissionId" TEXT NOT NULL,
    "athleteCount" INTEGER NOT NULL,
    "gymNameSnapshot" TEXT NOT NULL,
    "contactNameSnapshot" TEXT,
    "applicationIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventExternalRegistrationSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventExternalRegistrationLink_eventId_key" ON "EventExternalRegistrationLink"("eventId");
CREATE UNIQUE INDEX "EventExternalRegistrationLink_tokenHash_key" ON "EventExternalRegistrationLink"("tokenHash");
CREATE INDEX "EventExternalRegistrationLink_organizerId_idx" ON "EventExternalRegistrationLink"("organizerId");
CREATE INDEX "EventExternalRegistrationLink_status_idx" ON "EventExternalRegistrationLink"("status");

CREATE UNIQUE INDEX "EventExternalRegistrationSubmission_linkId_clientSubmissionId_key" ON "EventExternalRegistrationSubmission"("linkId", "clientSubmissionId");
CREATE INDEX "EventExternalRegistrationSubmission_linkId_idx" ON "EventExternalRegistrationSubmission"("linkId");

ALTER TABLE "EventExternalRegistrationLink" ADD CONSTRAINT "EventExternalRegistrationLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventExternalRegistrationLink" ADD CONSTRAINT "EventExternalRegistrationLink_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventExternalRegistrationLink" ADD CONSTRAINT "EventExternalRegistrationLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventExternalRegistrationSubmission" ADD CONSTRAINT "EventExternalRegistrationSubmission_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "EventExternalRegistrationLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;