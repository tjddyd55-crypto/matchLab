-- Fighter Career / Ranking Foundation
CREATE TYPE "FighterCareerRecordStatus" AS ENUM ('active', 'voided');

CREATE TABLE "FighterCareerMatchRecord" (
    "id" TEXT NOT NULL,
    "fighterId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "eventArchiveId" TEXT NOT NULL,
    "archiveVersion" INTEGER NOT NULL,
    "matchResultId" TEXT,
    "opponentFighterId" TEXT,
    "result" "MatchRecordOutcome" NOT NULL,
    "resultType" "BracketMatchOutcomeStyle",
    "sportType" TEXT,
    "divisionLabel" TEXT,
    "divisionSnapshot" JSONB,
    "fighterNameSnapshot" TEXT NOT NULL,
    "opponentNameSnapshot" TEXT,
    "gymNameSnapshot" TEXT,
    "opponentGymNameSnapshot" TEXT,
    "eventNameSnapshot" TEXT NOT NULL,
    "eventDateSnapshot" TIMESTAMP(3) NOT NULL,
    "matchNumber" INTEGER,
    "status" "FighterCareerRecordStatus" NOT NULL DEFAULT 'active',
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FighterCareerMatchRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FighterCareerStats" (
    "id" TEXT NOT NULL,
    "fighterId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "noContests" INTEGER NOT NULL DEFAULT 0,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "knockouts" INTEGER NOT NULL DEFAULT 0,
    "submissions" INTEGER NOT NULL DEFAULT 0,
    "decisions" INTEGER NOT NULL DEFAULT 0,
    "lastMatchAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FighterCareerStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FighterCareerMatchRecord_fighterId_eventArchiveId_matchId_key" ON "FighterCareerMatchRecord"("fighterId", "eventArchiveId", "matchId");
CREATE INDEX "FighterCareerMatchRecord_fighterId_status_idx" ON "FighterCareerMatchRecord"("fighterId", "status");
CREATE INDEX "FighterCareerMatchRecord_eventId_idx" ON "FighterCareerMatchRecord"("eventId");
CREATE INDEX "FighterCareerMatchRecord_eventArchiveId_idx" ON "FighterCareerMatchRecord"("eventArchiveId");
CREATE INDEX "FighterCareerMatchRecord_eventDateSnapshot_idx" ON "FighterCareerMatchRecord"("eventDateSnapshot");
CREATE INDEX "FighterCareerMatchRecord_sportType_idx" ON "FighterCareerMatchRecord"("sportType");
CREATE INDEX "FighterCareerMatchRecord_opponentFighterId_idx" ON "FighterCareerMatchRecord"("opponentFighterId");

CREATE UNIQUE INDEX "FighterCareerStats_fighterId_key" ON "FighterCareerStats"("fighterId");

ALTER TABLE "FighterCareerMatchRecord" ADD CONSTRAINT "FighterCareerMatchRecord_fighterId_fkey" FOREIGN KEY ("fighterId") REFERENCES "Fighter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FighterCareerMatchRecord" ADD CONSTRAINT "FighterCareerMatchRecord_opponentFighterId_fkey" FOREIGN KEY ("opponentFighterId") REFERENCES "Fighter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FighterCareerMatchRecord" ADD CONSTRAINT "FighterCareerMatchRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FighterCareerMatchRecord" ADD CONSTRAINT "FighterCareerMatchRecord_eventArchiveId_fkey" FOREIGN KEY ("eventArchiveId") REFERENCES "EventArchive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FighterCareerStats" ADD CONSTRAINT "FighterCareerStats_fighterId_fkey" FOREIGN KEY ("fighterId") REFERENCES "Fighter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
