-- AssociationNotice: 협회 회원사 공지 (audience = active AssociationMemberGym)

CREATE TABLE "AssociationNotice" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AssociationNotice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssociationNotice_organizerId_deletedAt_isPinned_publishedAt_idx" ON "AssociationNotice"("organizerId", "deletedAt", "isPinned", "publishedAt");

CREATE INDEX "AssociationNotice_organizerId_deletedAt_publishedAt_idx" ON "AssociationNotice"("organizerId", "deletedAt", "publishedAt");

ALTER TABLE "AssociationNotice" ADD CONSTRAINT "AssociationNotice_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssociationNotice" ADD CONSTRAINT "AssociationNotice_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
