-- Add delivery tracking and dedupe support for notifications
ALTER TABLE "Notification"
ADD COLUMN IF NOT EXISTS "deliveryOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "deliverySentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deliveryError" TEXT,
ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT,
ADD COLUMN IF NOT EXISTS "requestId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX IF NOT EXISTS "Notification_requestId_idx" ON "Notification"("requestId");
CREATE INDEX IF NOT EXISTS "Notification_deliveryOnly_idx" ON "Notification"("deliveryOnly");
