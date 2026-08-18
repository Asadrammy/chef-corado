-- Phase 3 completion: persisted market activation and country-aware legal
-- versioning foundation.
-- Additive only. Pricing configuration remains independent from market
-- activation. No unresolved legal document is published as ACTIVE here.

CREATE TABLE "MarketConfiguration" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "countryName" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "supported" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "paymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "legalEnabled" BOOLEAN NOT NULL DEFAULT false,
  "platformCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
  "serviceChargeTaxRate" DOUBLE PRECISION,
  "serviceChargeTaxStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "serviceChargeTaxDeductionEnabled" BOOLEAN NOT NULL DEFAULT false,
  "activationPrerequisites" TEXT,
  "internalNotes" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketConfiguration_countryCode_key" ON "MarketConfiguration"("countryCode");
CREATE INDEX "MarketConfiguration_active_idx" ON "MarketConfiguration"("active");
CREATE INDEX "MarketConfiguration_bookingEnabled_idx" ON "MarketConfiguration"("bookingEnabled");
CREATE INDEX "MarketConfiguration_paymentsEnabled_idx" ON "MarketConfiguration"("paymentsEnabled");

CREATE TABLE "LegalDocumentVersion" (
  "id" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "countryCode" TEXT,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "sourceName" TEXT,
  "checksum" TEXT,
  "notes" TEXT,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalDocumentVersion_documentType_countryCode_version_key" ON "LegalDocumentVersion"("documentType", "countryCode", "version");
CREATE INDEX "LegalDocumentVersion_documentType_countryCode_status_idx" ON "LegalDocumentVersion"("documentType", "countryCode", "status");

CREATE TABLE "UserLegalAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "countryCode" TEXT,
  "acceptedVia" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "UserLegalAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLegalAcceptance_userId_documentVersionId_key" ON "UserLegalAcceptance"("userId", "documentVersionId");
CREATE INDEX "UserLegalAcceptance_userId_role_countryCode_idx" ON "UserLegalAcceptance"("userId", "role", "countryCode");
CREATE INDEX "UserLegalAcceptance_documentVersionId_idx" ON "UserLegalAcceptance"("documentVersionId");

ALTER TABLE "UserLegalAcceptance"
  ADD CONSTRAINT "UserLegalAcceptance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLegalAcceptance"
  ADD CONSTRAINT "UserLegalAcceptance_documentVersionId_fkey"
  FOREIGN KEY ("documentVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "MarketConfiguration" (
  "id",
  "countryCode",
  "countryName",
  "currency",
  "supported",
  "active",
  "bookingEnabled",
  "paymentsEnabled",
  "legalEnabled",
  "platformCommissionRate",
  "serviceChargeTaxRate",
  "serviceChargeTaxStatus",
  "serviceChargeTaxDeductionEnabled",
  "activationPrerequisites",
  "internalNotes",
  "updatedAt"
) VALUES
  ('market-gb', 'GB', 'United Kingdom', 'GBP', true, true, true, true, true, 0.2, 0.2, 'CLIENT_CLARIFICATION_REQUIRED', false, 'Client confirmation required before enabling service-charge VAT deduction.', 'UK active first. VAT-on-service-charge rate represented, deduction disabled pending client clarification.', CURRENT_TIMESTAMP),
  ('market-us', 'US', 'United States', 'USD', true, false, false, false, false, 0.2, NULL, 'NOT_CONFIGURED', false, 'US legal/business/payment activation and tax configuration required.', 'Prepared but inactive. Pricing readiness must not activate booking or checkout.', CURRENT_TIMESTAMP),
  ('market-it', 'IT', 'Italy', 'EUR', true, false, false, false, false, 0.2, 0.22, 'MARKET_INACTIVE', false, 'Italy legal/business/payment activation required.', 'Prepared but inactive. VAT rate retained for future activation only.', CURRENT_TIMESTAMP),
  ('market-ke', 'KE', 'Kenya', 'KES', true, false, false, false, false, 0.2, 0.16, 'MARKET_INACTIVE', false, 'Kenya legal/business/payment activation required.', 'Prepared but inactive. Tax rate retained for future activation only.', CURRENT_TIMESTAMP);

INSERT INTO "LegalDocumentVersion" (
  "id",
  "documentType",
  "countryCode",
  "version",
  "status",
  "sourceName",
  "notes",
  "updatedAt"
) VALUES
  ('legal-terms-uk-2026-08-pending', 'TERMS', 'GB', '2026-08-UK-DOCX', 'PENDING_APPROVAL', 'CHEFACHEF TERMS AND CONDITIONS UK.docx', 'Pending contact-email/company-number/legal publication confirmation. Not active.', CURRENT_TIMESTAMP),
  ('legal-terms-us-2026-08-pending', 'TERMS', 'US', '2026-08-US-DOCX', 'PENDING_APPROVAL', 'CHEFACHEF TERMS AND CONDITIONS USA USERS.docx', 'Future-dated relative to 2026-08-12 and USA market inactive. Not active.', CURRENT_TIMESTAMP),
  ('legal-privacy-2026-08-pending', 'PRIVACY_POLICY', NULL, '2026-08-PRIVACY-DOCX', 'PENDING_APPROVAL', 'CHEFACHEF PRIVACY POLICY.docx', 'Pending contact-email and London-only storage confirmation. Not active.', CURRENT_TIMESTAMP);
