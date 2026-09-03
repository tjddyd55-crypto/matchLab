-- Additive org owner for MATCHON SaaS billing (Gym / Association).
-- Non-destructive: keep userId; do not drop/reset existing billing rows.

-- Gym / Organizer org-scoped Toss customerKey
ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "tossCustomerKey" TEXT;
ALTER TABLE "Organizer" ADD COLUMN IF NOT EXISTS "tossCustomerKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Gym_tossCustomerKey_key" ON "Gym"("tossCustomerKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Organizer_tossCustomerKey_key" ON "Organizer"("tossCustomerKey");

-- BillingSubscription org owner + environment
ALTER TABLE "BillingSubscription" ADD COLUMN IF NOT EXISTS "gymId" TEXT;
ALTER TABLE "BillingSubscription" ADD COLUMN IF NOT EXISTS "organizerId" TEXT;
ALTER TABLE "BillingSubscription" ADD COLUMN IF NOT EXISTS "providerEnvironment" "BillingProviderEnvironment";

CREATE INDEX IF NOT EXISTS "BillingSubscription_gymId_status_idx" ON "BillingSubscription"("gymId", "status");
CREATE INDEX IF NOT EXISTS "BillingSubscription_organizerId_status_idx" ON "BillingSubscription"("organizerId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingSubscription_gymId_fkey'
  ) THEN
    ALTER TABLE "BillingSubscription"
      ADD CONSTRAINT "BillingSubscription_gymId_fkey"
      FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingSubscription_organizerId_fkey'
  ) THEN
    ALTER TABLE "BillingSubscription"
      ADD CONSTRAINT "BillingSubscription_organizerId_fkey"
      FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- BillingPaymentMethod org owner + environment
ALTER TABLE "BillingPaymentMethod" ADD COLUMN IF NOT EXISTS "gymId" TEXT;
ALTER TABLE "BillingPaymentMethod" ADD COLUMN IF NOT EXISTS "organizerId" TEXT;
ALTER TABLE "BillingPaymentMethod" ADD COLUMN IF NOT EXISTS "providerEnvironment" "BillingProviderEnvironment";

CREATE INDEX IF NOT EXISTS "BillingPaymentMethod_gymId_deletedAt_isDefault_idx"
  ON "BillingPaymentMethod"("gymId", "deletedAt", "isDefault");
CREATE INDEX IF NOT EXISTS "BillingPaymentMethod_organizerId_deletedAt_isDefault_idx"
  ON "BillingPaymentMethod"("organizerId", "deletedAt", "isDefault");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingPaymentMethod_gymId_fkey'
  ) THEN
    ALTER TABLE "BillingPaymentMethod"
      ADD CONSTRAINT "BillingPaymentMethod_gymId_fkey"
      FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingPaymentMethod_organizerId_fkey'
  ) THEN
    ALTER TABLE "BillingPaymentMethod"
      ADD CONSTRAINT "BillingPaymentMethod_organizerId_fkey"
      FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- BillingPayment org owner + actor + environment
ALTER TABLE "BillingPayment" ADD COLUMN IF NOT EXISTS "actorUserId" TEXT;
ALTER TABLE "BillingPayment" ADD COLUMN IF NOT EXISTS "gymId" TEXT;
ALTER TABLE "BillingPayment" ADD COLUMN IF NOT EXISTS "organizerId" TEXT;
ALTER TABLE "BillingPayment" ADD COLUMN IF NOT EXISTS "providerEnvironment" "BillingProviderEnvironment";

CREATE INDEX IF NOT EXISTS "BillingPayment_gymId_createdAt_idx" ON "BillingPayment"("gymId", "createdAt");
CREATE INDEX IF NOT EXISTS "BillingPayment_organizerId_createdAt_idx" ON "BillingPayment"("organizerId", "createdAt");
CREATE INDEX IF NOT EXISTS "BillingPayment_actorUserId_createdAt_idx" ON "BillingPayment"("actorUserId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingPayment_actorUserId_fkey'
  ) THEN
    ALTER TABLE "BillingPayment"
      ADD CONSTRAINT "BillingPayment_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingPayment_gymId_fkey'
  ) THEN
    ALTER TABLE "BillingPayment"
      ADD CONSTRAINT "BillingPayment_gymId_fkey"
      FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingPayment_organizerId_fkey'
  ) THEN
    ALTER TABLE "BillingPayment"
      ADD CONSTRAINT "BillingPayment_organizerId_fkey"
      FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Deterministic backfill only:
-- 1) Gym: subscription.userId is sole Gym.ownerUserId and user owns exactly 1 gym
--    and user does NOT also own an Organizer row.
UPDATE "BillingSubscription" s
SET "gymId" = g.id
FROM "Gym" g
WHERE s."userId" = g."ownerUserId"
  AND s."gymId" IS NULL
  AND s."organizerId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Organizer" o WHERE o."userId" = s."userId"
  )
  AND (
    SELECT COUNT(*)::int FROM "Gym" g2 WHERE g2."ownerUserId" = s."userId"
  ) = 1;

UPDATE "BillingPaymentMethod" m
SET "gymId" = g.id
FROM "Gym" g
WHERE m."userId" = g."ownerUserId"
  AND m."gymId" IS NULL
  AND m."organizerId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Organizer" o WHERE o."userId" = m."userId"
  )
  AND (
    SELECT COUNT(*)::int FROM "Gym" g2 WHERE g2."ownerUserId" = m."userId"
  ) = 1;

UPDATE "BillingPayment" p
SET "gymId" = g.id
FROM "Gym" g
WHERE p."userId" = g."ownerUserId"
  AND p."gymId" IS NULL
  AND p."organizerId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Organizer" o WHERE o."userId" = p."userId"
  )
  AND (
    SELECT COUNT(*)::int FROM "Gym" g2 WHERE g2."ownerUserId" = p."userId"
  ) = 1;

-- 2) Organizer: subscription.userId matches Organizer.userId 1:1
--    and user does NOT also own a Gym.
UPDATE "BillingSubscription" s
SET "organizerId" = o.id
FROM "Organizer" o
WHERE s."userId" = o."userId"
  AND s."gymId" IS NULL
  AND s."organizerId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Gym" g WHERE g."ownerUserId" = s."userId"
  );

UPDATE "BillingPaymentMethod" m
SET "organizerId" = o.id
FROM "Organizer" o
WHERE m."userId" = o."userId"
  AND m."gymId" IS NULL
  AND m."organizerId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Gym" g WHERE g."ownerUserId" = m."userId"
  );

UPDATE "BillingPayment" p
SET "organizerId" = o.id
FROM "Organizer" o
WHERE p."userId" = o."userId"
  AND p."gymId" IS NULL
  AND p."organizerId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Gym" g WHERE g."ownerUserId" = p."userId"
  );
