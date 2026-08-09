ALTER TABLE "ServicePricingRule"
ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "activatedBy" TEXT,
ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "retiredBy" TEXT,
ADD COLUMN IF NOT EXISTS "retiredAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lifecycleReason" TEXT,
ADD COLUMN IF NOT EXISTS "childrenRuleSummary" TEXT;

CREATE INDEX IF NOT EXISTS "ServicePricingRule_status_effectiveFrom_idx" ON "ServicePricingRule"("status", "effectiveFrom");
