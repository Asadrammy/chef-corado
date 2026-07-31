-- Backward-compatible geocoding metadata.
ALTER TABLE "ChefProfile"
  ADD COLUMN IF NOT EXISTS "locationCity" TEXT,
  ADD COLUMN IF NOT EXISTS "locationRegion" TEXT,
  ADD COLUMN IF NOT EXISTS "formattedAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "geocodingProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "geocodingStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';

ALTER TABLE "Request"
  ADD COLUMN IF NOT EXISTS "locationCity" TEXT,
  ADD COLUMN IF NOT EXISTS "locationRegion" TEXT,
  ADD COLUMN IF NOT EXISTS "formattedAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "geocodingProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "geocodingStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';

-- Manual payout workflow metadata. These fields are nullable so existing payouts are preserved.
ALTER TABLE "Payout"
  ADD COLUMN IF NOT EXISTS "adminNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "externalReference" TEXT,
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT;

UPDATE "Payout"
SET "status" = 'PAID'
WHERE "status" = 'COMPLETED';
