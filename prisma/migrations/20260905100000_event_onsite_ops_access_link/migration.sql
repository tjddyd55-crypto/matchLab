-- CreateTable
CREATE TABLE "EventOnsiteOpsAccessLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "publicToken" TEXT,
    "tokenHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "lastRotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOnsiteOpsAccessLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventOnsiteOpsAccessLink_eventId_key" ON "EventOnsiteOpsAccessLink"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventOnsiteOpsAccessLink_publicToken_key" ON "EventOnsiteOpsAccessLink"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "EventOnsiteOpsAccessLink_tokenHash_key" ON "EventOnsiteOpsAccessLink"("tokenHash");

-- CreateIndex
CREATE INDEX "EventOnsiteOpsAccessLink_eventId_isActive_idx" ON "EventOnsiteOpsAccessLink"("eventId", "isActive");

-- CreateIndex
CREATE INDEX "EventOnsiteOpsAccessLink_tokenHash_idx" ON "EventOnsiteOpsAccessLink"("tokenHash");

-- AddForeignKey
ALTER TABLE "EventOnsiteOpsAccessLink" ADD CONSTRAINT "EventOnsiteOpsAccessLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
