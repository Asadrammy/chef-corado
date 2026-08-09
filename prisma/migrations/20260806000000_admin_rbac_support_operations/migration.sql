ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "adminRole" TEXT,
ADD COLUMN IF NOT EXISTS "adminPermissions" TEXT,
ADD COLUMN IF NOT EXISTS "adminDisabledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "adminLastPermissionChangeAt" TIMESTAMP(3);

UPDATE "User"
SET "adminRole" = 'SUPER_ADMIN',
    "adminLastPermissionChangeAt" = COALESCE("adminLastPermissionChangeAt", now())
WHERE "role" = 'ADMIN'
  AND "adminRole" IS NULL;

CREATE INDEX IF NOT EXISTS "User_adminRole_idx" ON "User"("adminRole");

CREATE TABLE IF NOT EXISTS "ServiceAsset" (
  "id" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "altText" TEXT NOT NULL,
  "source" TEXT,
  "photographer" TEXT,
  "licence" TEXT,
  "licenceUrl" TEXT,
  "suppliedByClient" BOOLEAN NOT NULL DEFAULT false,
  "clientApproved" BOOLEAN NOT NULL DEFAULT false,
  "usageLocations" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "internalNotes" TEXT,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServiceAsset_serviceType_idx" ON "ServiceAsset"("serviceType");
CREATE INDEX IF NOT EXISTS "ServiceAsset_status_idx" ON "ServiceAsset"("status");
CREATE INDEX IF NOT EXISTS "ServiceAsset_clientApproved_idx" ON "ServiceAsset"("clientApproved");

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT,
  "requesterRole" TEXT,
  "requesterEmail" TEXT,
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "assignedTo" TEXT,
  "relatedRequestId" TEXT,
  "relatedBookingId" TEXT,
  "relatedPaymentId" TEXT,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "resolution" TEXT,
  "satisfactionScore" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedTo_idx" ON "SupportTicket"("assignedTo");
CREATE INDEX IF NOT EXISTS "SupportTicket_requesterId_idx" ON "SupportTicket"("requesterId");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderId" TEXT,
  "senderRole" TEXT,
  "message" TEXT NOT NULL,
  "internal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportTicketMessage_ticketId_idx" ON "SupportTicketMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_createdAt_idx" ON "SupportTicketMessage"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupportTicketMessage_ticketId_fkey'
  ) THEN
    ALTER TABLE "SupportTicketMessage"
    ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT,
  "paymentId" TEXT,
  "invoiceNumber" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "subtotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "recipientName" TEXT,
  "recipientEmail" TEXT,
  "issuedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "internalNotes" TEXT,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "Invoice_bookingId_idx" ON "Invoice"("bookingId");
CREATE INDEX IF NOT EXISTS "Invoice_paymentId_idx" ON "Invoice"("paymentId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "Invoice_currency_idx" ON "Invoice"("currency");
CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt");
