-- Phase 2: structured Multi-Day Chef Hire requirements.
-- Additive only. Existing requests, proposals, bookings, and payments remain intact.

ALTER TABLE "Request"
  ADD COLUMN "budgetMode" TEXT,
  ADD COLUMN "totalBudget" DOUBLE PRECISION,
  ADD COLUMN "defaultDailyBudget" DOUBLE PRECISION;

ALTER TABLE "MultiDayRequestDate"
  ADD COLUMN "serviceType" TEXT,
  ADD COLUMN "serviceTypeLabel" TEXT,
  ADD COLUMN "serviceTier" TEXT,
  ADD COLUMN "cuisineTypes" TEXT,
  ADD COLUMN "dietaryRequirements" TEXT,
  ADD COLUMN "serviceSpecificAnswers" TEXT,
  ADD COLUMN "adultCount" INTEGER,
  ADD COLUMN "childrenUnder10" INTEGER,
  ADD COLUMN "actualAttendeeCount" INTEGER,
  ADD COLUMN "billableGuestCount" DOUBLE PRECISION,
  ADD COLUMN "pricingGuestCount" DOUBLE PRECISION,
  ADD COLUMN "budget" DOUBLE PRECISION,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "MultiDayRequestDate_requestId_sortOrder_idx" ON "MultiDayRequestDate"("requestId", "sortOrder");

CREATE TABLE "ProposalLineItem" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "serviceDate" TIMESTAMP(3),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "price" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProposalLineItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProposalLineItem_proposalId_sortOrder_idx" ON "ProposalLineItem"("proposalId", "sortOrder");
CREATE INDEX "ProposalLineItem_serviceDate_idx" ON "ProposalLineItem"("serviceDate");

ALTER TABLE "ProposalLineItem"
  ADD CONSTRAINT "ProposalLineItem_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BookingServiceDate" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "serviceType" TEXT,
  "serviceTypeLabel" TEXT,
  "cuisineTypes" TEXT,
  "dietaryRequirements" TEXT,
  "adultCount" INTEGER,
  "childrenUnder10" INTEGER,
  "actualAttendeeCount" INTEGER,
  "billableGuestCount" DOUBLE PRECISION,
  "pricingGuestCount" DOUBLE PRECISION,
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingServiceDate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingServiceDate_bookingId_date_key" ON "BookingServiceDate"("bookingId", "date");
CREATE INDEX "BookingServiceDate_date_idx" ON "BookingServiceDate"("date");
CREATE INDEX "BookingServiceDate_bookingId_sortOrder_idx" ON "BookingServiceDate"("bookingId", "sortOrder");

ALTER TABLE "BookingServiceDate"
  ADD CONSTRAINT "BookingServiceDate_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
