ALTER TABLE "FullTimeChefEnquiry"
ADD COLUMN IF NOT EXISTS "assignedTo" TEXT,
ADD COLUMN IF NOT EXISTS "internalNotes" TEXT,
ADD COLUMN IF NOT EXISTS "qualifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "closedReason" TEXT;

CREATE INDEX IF NOT EXISTS "FullTimeChefEnquiry_assignedTo_idx" ON "FullTimeChefEnquiry"("assignedTo");

ALTER TABLE "Dispute"
ADD COLUMN IF NOT EXISTS "assignedTo" TEXT,
ADD COLUMN IF NOT EXISTS "investigationState" TEXT,
ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;

CREATE INDEX IF NOT EXISTS "Dispute_assignedTo_idx" ON "Dispute"("assignedTo");

CREATE TABLE IF NOT EXISTS "BackgroundCheck" (
  "id" TEXT NOT NULL,
  "chefId" TEXT NOT NULL,
  "checkType" TEXT NOT NULL,
  "provider" TEXT,
  "reference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "submittedAt" TIMESTAMP(3),
  "reviewerId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "recheckAt" TIMESTAMP(3),
  "internalNotes" TEXT,
  "requestedUpdateAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackgroundCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BackgroundCheck_chefId_idx" ON "BackgroundCheck"("chefId");
CREATE INDEX IF NOT EXISTS "BackgroundCheck_status_idx" ON "BackgroundCheck"("status");
CREATE INDEX IF NOT EXISTS "BackgroundCheck_checkType_idx" ON "BackgroundCheck"("checkType");
CREATE INDEX IF NOT EXISTS "BackgroundCheck_expiresAt_idx" ON "BackgroundCheck"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BackgroundCheck_chefId_fkey'
  ) THEN
    ALTER TABLE "BackgroundCheck"
    ADD CONSTRAINT "BackgroundCheck_chefId_fkey"
    FOREIGN KEY ("chefId") REFERENCES "ChefProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
