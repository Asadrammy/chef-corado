-- Phase 3: payment-level marketplace service-charge tax breakdown.
-- Additive only. Existing payments remain compatible and are treated as legacy
-- if these fields are null or zero.

ALTER TABLE "Payment"
  ADD COLUMN "platformCommissionRate" DOUBLE PRECISION,
  ADD COLUMN "serviceChargeTaxRate" DOUBLE PRECISION,
  ADD COLUMN "serviceChargeTaxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "serviceChargeTaxDeductionEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "totalPlatformDeduction" DOUBLE PRECISION,
  ADD COLUMN "taxJurisdiction" TEXT,
  ADD COLUMN "serviceChargeTaxStatus" TEXT;

CREATE INDEX "Payment_taxJurisdiction_idx" ON "Payment"("taxJurisdiction");
CREATE INDEX "Payment_serviceChargeTaxStatus_idx" ON "Payment"("serviceChargeTaxStatus");
