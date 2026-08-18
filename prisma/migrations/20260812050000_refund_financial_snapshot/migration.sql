-- Phase 3 completion: policy-neutral refund financial snapshot.
-- Additive only. These fields preserve the original payment breakdown for
-- future refund policy decisions without inventing historical tax treatment.

ALTER TABLE "Refund"
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "originalGrossAmount" DOUBLE PRECISION,
  ADD COLUMN "originalCommissionAmount" DOUBLE PRECISION,
  ADD COLUMN "originalServiceChargeTaxAmount" DOUBLE PRECISION,
  ADD COLUMN "originalTotalPlatformDeduction" DOUBLE PRECISION,
  ADD COLUMN "originalChefAmount" DOUBLE PRECISION,
  ADD COLUMN "originalServiceChargeTaxStatus" TEXT;
