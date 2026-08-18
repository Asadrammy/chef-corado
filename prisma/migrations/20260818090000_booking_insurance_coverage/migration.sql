-- Implementation Pass 2: internal platform insurance booking coverage.
-- Additive only. No historical booking is guessed/backfilled.

CREATE TABLE IF NOT EXISTS "PlatformInsurancePolicy" (
  "id" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "coverageType" TEXT NOT NULL DEFAULT 'PUBLIC_LIABILITY',
  "coverageLimitMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "internalReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformInsurancePolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BookingInsuranceCoverage" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "chefId" TEXT NOT NULL,
  "platformPolicyId" TEXT,
  "policyVersion" TEXT NOT NULL,
  "coverageType" TEXT NOT NULL DEFAULT 'PUBLIC_LIABILITY',
  "coverageLimitMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "coverageStatus" TEXT NOT NULL DEFAULT 'QUALIFIED',
  "coverageStartAt" TIMESTAMP(3) NOT NULL,
  "coverageEndAt" TIMESTAMP(3) NOT NULL,
  "qualifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "qualificationBasis" TEXT NOT NULL,
  "serviceDateSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingInsuranceCoverage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformInsurancePolicy_policyVersion_key" ON "PlatformInsurancePolicy"("policyVersion");
CREATE INDEX IF NOT EXISTS "PlatformInsurancePolicy_status_idx" ON "PlatformInsurancePolicy"("status");
CREATE INDEX IF NOT EXISTS "PlatformInsurancePolicy_coverageType_status_idx" ON "PlatformInsurancePolicy"("coverageType", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "BookingInsuranceCoverage_bookingId_key" ON "BookingInsuranceCoverage"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingInsuranceCoverage_chefId_idx" ON "BookingInsuranceCoverage"("chefId");
CREATE INDEX IF NOT EXISTS "BookingInsuranceCoverage_coverageStatus_idx" ON "BookingInsuranceCoverage"("coverageStatus");
CREATE INDEX IF NOT EXISTS "BookingInsuranceCoverage_coverageStartAt_idx" ON "BookingInsuranceCoverage"("coverageStartAt");
CREATE INDEX IF NOT EXISTS "BookingInsuranceCoverage_platformPolicyId_idx" ON "BookingInsuranceCoverage"("platformPolicyId");

ALTER TABLE "BookingInsuranceCoverage"
  ADD CONSTRAINT "BookingInsuranceCoverage_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingInsuranceCoverage"
  ADD CONSTRAINT "BookingInsuranceCoverage_chefId_fkey"
  FOREIGN KEY ("chefId") REFERENCES "ChefProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingInsuranceCoverage"
  ADD CONSTRAINT "BookingInsuranceCoverage_platformPolicyId_fkey"
  FOREIGN KEY ("platformPolicyId") REFERENCES "PlatformInsurancePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
