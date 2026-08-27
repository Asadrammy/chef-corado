-- Pass 5 forward-only remediation: request photos, persisted client profile settings,
-- and payout ledger idempotency.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "bio" TEXT,
  ADD COLUMN IF NOT EXISTS "website" TEXT,
  ADD COLUMN IF NOT EXISTS "socialProfile" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "RequestPhoto" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "uploaderId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT,
  "originalName" TEXT,
  "contentType" TEXT,
  "sizeBytes" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RequestPhoto_requestId_sortOrder_idx" ON "RequestPhoto"("requestId", "sortOrder");
CREATE INDEX IF NOT EXISTS "RequestPhoto_uploaderId_idx" ON "RequestPhoto"("uploaderId");

ALTER TABLE "RequestPhoto"
  ADD CONSTRAINT "RequestPhoto_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequestPhoto"
  ADD CONSTRAINT "RequestPhoto_uploaderId_fkey"
  FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "Ledger_transactionType_payoutId_key"
  ON "Ledger"("transactionType", "payoutId");
