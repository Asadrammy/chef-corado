-- Additive client-requirements completion fields.
-- These preserve existing financial booking status while adding product-specific
-- pricing and operations state for marketplace workflows.

ALTER TABLE "Request"
ADD COLUMN IF NOT EXISTS "pricingStatus" TEXT NOT NULL DEFAULT 'LOCAL_QUOTE_REQUIRED',
ADD COLUMN IF NOT EXISTS "budgetStatus" TEXT NOT NULL DEFAULT 'UNASSESSED',
ADD COLUMN IF NOT EXISTS "budgetWarning" TEXT;

CREATE INDEX IF NOT EXISTS "Request_pricingStatus_idx" ON "Request"("pricingStatus");
CREATE INDEX IF NOT EXISTS "Request_budgetStatus_idx" ON "Request"("budgetStatus");

ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "operationalStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN IF NOT EXISTS "operationalStatusUpdatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "operationalStatusUpdatedBy" TEXT,
ADD COLUMN IF NOT EXISTS "operationalNotes" TEXT;

CREATE INDEX IF NOT EXISTS "Booking_operationalStatus_idx" ON "Booking"("operationalStatus");

ALTER TABLE "Payout"
ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'GBP';
