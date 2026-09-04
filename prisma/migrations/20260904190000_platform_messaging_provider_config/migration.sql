-- Platform auth SMS (MATCHON 공용 Aligo credential)

CREATE TABLE "PlatformMessagingProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" "MessagingProviderKind" NOT NULL DEFAULT 'aligo',
    "loginId" TEXT,
    "apiKeyCipher" BYTEA,
    "apiKeyIv" BYTEA,
    "apiKeyAuthTag" BYTEA,
    "apiKeyKeyVer" TEXT,
    "senderPhone" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformMessagingProviderConfig_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlatformMessagingProviderConfig" ADD CONSTRAINT "PlatformMessagingProviderConfig_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
