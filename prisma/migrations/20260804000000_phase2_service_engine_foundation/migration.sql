ALTER TABLE "Request"
ADD COLUMN IF NOT EXISTS "requestMode" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS "serviceTier" TEXT,
ADD COLUMN IF NOT EXISTS "pricingRuleId" TEXT,
ADD COLUMN IF NOT EXISTS "adultCount" INTEGER,
ADD COLUMN IF NOT EXISTS "actualAttendeeCount" INTEGER,
ADD COLUMN IF NOT EXISTS "pricingGuestCount" DOUBLE PRECISION;

ALTER TABLE "Request"
ALTER COLUMN "billableGuestCount" TYPE DOUBLE PRECISION
USING "billableGuestCount"::DOUBLE PRECISION;

ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "adultCount" INTEGER,
ADD COLUMN IF NOT EXISTS "childrenUnder10" INTEGER,
ADD COLUMN IF NOT EXISTS "actualAttendeeCount" INTEGER,
ADD COLUMN IF NOT EXISTS "billableGuestCount" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "pricingGuestCount" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "serviceType" TEXT,
ADD COLUMN IF NOT EXISTS "serviceTypeLabel" TEXT,
ADD COLUMN IF NOT EXISTS "pricingRuleVersion" TEXT;

CREATE TABLE IF NOT EXISTS "ServicePricingRule" (
  "id" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "tier" TEXT,
  "minGuests" INTEGER,
  "maxGuests" INTEGER,
  "minimumSpend" DOUBLE PRECISION,
  "pricePerPersonMin" DOUBLE PRECISION,
  "pricePerPersonMax" DOUBLE PRECISION,
  "customerGuidance" TEXT,
  "warningCopy" TEXT,
  "evidenceSource" TEXT,
  "evidenceNotes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServicePricingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MultiDayRequestDate" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "serviceNeeds" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MultiDayRequestDate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FullTimeChefEnquiry" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL DEFAULT 'GB',
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "desiredStartDate" TIMESTAMP(3) NOT NULL,
  "expectedDuration" TEXT NOT NULL,
  "placementType" TEXT NOT NULL,
  "liveInPreference" TEXT NOT NULL,
  "workingDays" TEXT NOT NULL,
  "workingHours" TEXT NOT NULL,
  "householdSize" INTEGER,
  "adultCount" INTEGER,
  "childrenUnder10" INTEGER,
  "responsibilities" TEXT,
  "cuisineTypes" TEXT,
  "dietaryRequirements" TEXT,
  "budgetAmount" DOUBLE PRECISION,
  "budgetPeriod" TEXT,
  "travelRequirements" TEXT,
  "legalWorkRequirements" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FullTimeChefEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Request_serviceType_idx" ON "Request"("serviceType");
CREATE INDEX IF NOT EXISTS "Request_requestMode_idx" ON "Request"("requestMode");
CREATE INDEX IF NOT EXISTS "Request_pricingRuleId_idx" ON "Request"("pricingRuleId");
CREATE INDEX IF NOT EXISTS "ServicePricingRule_serviceType_countryCode_currency_status_idx" ON "ServicePricingRule"("serviceType", "countryCode", "currency", "status");
CREATE INDEX IF NOT EXISTS "ServicePricingRule_version_idx" ON "ServicePricingRule"("version");
CREATE UNIQUE INDEX IF NOT EXISTS "MultiDayRequestDate_requestId_date_key" ON "MultiDayRequestDate"("requestId", "date");
CREATE INDEX IF NOT EXISTS "MultiDayRequestDate_date_idx" ON "MultiDayRequestDate"("date");
CREATE INDEX IF NOT EXISTS "FullTimeChefEnquiry_clientId_idx" ON "FullTimeChefEnquiry"("clientId");
CREATE INDEX IF NOT EXISTS "FullTimeChefEnquiry_status_idx" ON "FullTimeChefEnquiry"("status");
CREATE INDEX IF NOT EXISTS "FullTimeChefEnquiry_countryCode_idx" ON "FullTimeChefEnquiry"("countryCode");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Request_pricingRuleId_fkey') THEN
    ALTER TABLE "Request"
    ADD CONSTRAINT "Request_pricingRuleId_fkey"
    FOREIGN KEY ("pricingRuleId") REFERENCES "ServicePricingRule"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MultiDayRequestDate_requestId_fkey') THEN
    ALTER TABLE "MultiDayRequestDate"
    ADD CONSTRAINT "MultiDayRequestDate_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "Request"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FullTimeChefEnquiry_clientId_fkey') THEN
    ALTER TABLE "FullTimeChefEnquiry"
    ADD CONSTRAINT "FullTimeChefEnquiry_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
