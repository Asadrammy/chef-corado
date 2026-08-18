-- Implementation Pass B: additive payment-policy alignment.
-- Do not deploy automatically; apply after prior pending migrations are reviewed.

ALTER TABLE "PaymentPlan"
  ADD COLUMN IF NOT EXISTS "depositBasisPoints" INTEGER,
  ADD COLUMN IF NOT EXISTS "guarantorUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "guarantorAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recoveryStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "recoveryStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "supportEscalatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "graceEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shortfallAmountMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shortfallChargedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "shortfallFailedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastFailureCode" TEXT,
  ADD COLUMN IF NOT EXISTS "lastFailureMessage" TEXT;

ALTER TABLE "PaymentInstallment"
  ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3);

ALTER TABLE "BookingGuestAmendment"
  ADD COLUMN IF NOT EXISTS "chefDecisionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "chefDecisionBy" TEXT,
  ADD COLUMN IF NOT EXISTS "clientAcceptedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PaymentPlan_guarantorUserId_idx" ON "PaymentPlan"("guarantorUserId");
CREATE INDEX IF NOT EXISTS "PaymentPlan_recoveryStatus_idx" ON "PaymentPlan"("recoveryStatus");
CREATE INDEX IF NOT EXISTS "PaymentInstallment_nextAttemptAt_idx" ON "PaymentInstallment"("nextAttemptAt");
