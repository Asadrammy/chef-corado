-- Implementation Pass 2: additive payment-plan and guest-amendment foundation.
-- This migration intentionally preserves the legacy one-to-one Payment model.

CREATE TABLE "PaymentPlan" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "bookingId" TEXT,
  "planType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalAmountMinor" INTEGER NOT NULL,
  "paidAmountMinor" INTEGER NOT NULL DEFAULT 0,
  "outstandingAmountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "eventAnchorDate" TIMESTAMP(3) NOT NULL,
  "deadlineAt" TIMESTAMP(3),
  "balanceDueAt" TIMESTAMP(3),
  "stripeCustomerId" TEXT,
  "defaultPaymentMethodId" TEXT,
  "futureUseConsentAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentInstallment" (
  "id" TEXT NOT NULL,
  "paymentPlanId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "stripeSetupIntentId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SplitBillShare" (
  "id" TEXT NOT NULL,
  "paymentPlanId" TEXT NOT NULL,
  "installmentId" TEXT,
  "payerName" TEXT,
  "payerEmail" TEXT,
  "tokenHash" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "deadlineAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "refundState" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SplitBillShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcceptedPricingSnapshot" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "originalAdultCount" INTEGER,
  "originalChildrenUnder10" INTEGER,
  "originalGuestCount" INTEGER NOT NULL,
  "originalActualAttendeeCount" INTEGER,
  "originalBillableGuestCount" DOUBLE PRECISION,
  "originalPricingGuestCount" DOUBLE PRECISION,
  "acceptedTotalMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "minimumSpendMinor" INTEGER,
  "perPersonAmountMinor" INTEGER,
  "pricingBasis" TEXT NOT NULL,
  "pricingRuleVersion" TEXT,
  "commissionRate" DOUBLE PRECISION NOT NULL,
  "serviceContext" JSONB,
  "serviceDates" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AcceptedPricingSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingGuestAmendment" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "paymentPlanId" TEXT,
  "requesterId" TEXT NOT NULL,
  "requesterRole" TEXT NOT NULL,
  "amendmentType" TEXT NOT NULL,
  "previousAdultCount" INTEGER,
  "previousChildrenUnder10" INTEGER,
  "previousGuestCount" INTEGER NOT NULL,
  "requestedAdultCount" INTEGER,
  "requestedChildrenUnder10" INTEGER,
  "requestedGuestCount" INTEGER NOT NULL,
  "addedAdultCount" INTEGER NOT NULL DEFAULT 0,
  "addedChildrenUnder10" INTEGER NOT NULL DEFAULT 0,
  "removedAdultCount" INTEGER NOT NULL DEFAULT 0,
  "removedChildrenUnder10" INTEGER NOT NULL DEFAULT 0,
  "reductionPercent" DOUBLE PRECISION,
  "pricingBasis" TEXT,
  "incrementalAmountMinor" INTEGER NOT NULL DEFAULT 0,
  "refundAmountMinor" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "refundId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "adminNotes" TEXT,
  "chefReviewNotes" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingGuestAmendment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentPlan_proposalId_key" ON "PaymentPlan"("proposalId");
CREATE UNIQUE INDEX "PaymentPlan_bookingId_key" ON "PaymentPlan"("bookingId");
CREATE UNIQUE INDEX "PaymentPlan_idempotencyKey_key" ON "PaymentPlan"("idempotencyKey");
CREATE INDEX "PaymentPlan_planType_idx" ON "PaymentPlan"("planType");
CREATE INDEX "PaymentPlan_status_idx" ON "PaymentPlan"("status");
CREATE INDEX "PaymentPlan_eventAnchorDate_idx" ON "PaymentPlan"("eventAnchorDate");
CREATE INDEX "PaymentPlan_balanceDueAt_idx" ON "PaymentPlan"("balanceDueAt");
CREATE INDEX "PaymentPlan_deadlineAt_idx" ON "PaymentPlan"("deadlineAt");

CREATE UNIQUE INDEX "PaymentInstallment_stripeCheckoutSessionId_key" ON "PaymentInstallment"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "PaymentInstallment_stripePaymentIntentId_key" ON "PaymentInstallment"("stripePaymentIntentId");
CREATE UNIQUE INDEX "PaymentInstallment_idempotencyKey_key" ON "PaymentInstallment"("idempotencyKey");
CREATE INDEX "PaymentInstallment_paymentPlanId_kind_idx" ON "PaymentInstallment"("paymentPlanId", "kind");
CREATE INDEX "PaymentInstallment_status_idx" ON "PaymentInstallment"("status");
CREATE INDEX "PaymentInstallment_dueAt_idx" ON "PaymentInstallment"("dueAt");
CREATE INDEX "PaymentInstallment_stripePaymentIntentId_idx" ON "PaymentInstallment"("stripePaymentIntentId");

CREATE UNIQUE INDEX "SplitBillShare_installmentId_key" ON "SplitBillShare"("installmentId");
CREATE UNIQUE INDEX "SplitBillShare_tokenHash_key" ON "SplitBillShare"("tokenHash");
CREATE UNIQUE INDEX "SplitBillShare_stripeCheckoutSessionId_key" ON "SplitBillShare"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "SplitBillShare_stripePaymentIntentId_key" ON "SplitBillShare"("stripePaymentIntentId");
CREATE UNIQUE INDEX "SplitBillShare_idempotencyKey_key" ON "SplitBillShare"("idempotencyKey");
CREATE INDEX "SplitBillShare_paymentPlanId_status_idx" ON "SplitBillShare"("paymentPlanId", "status");
CREATE INDEX "SplitBillShare_deadlineAt_idx" ON "SplitBillShare"("deadlineAt");
CREATE INDEX "SplitBillShare_payerEmail_idx" ON "SplitBillShare"("payerEmail");

CREATE UNIQUE INDEX "AcceptedPricingSnapshot_bookingId_key" ON "AcceptedPricingSnapshot"("bookingId");
CREATE INDEX "AcceptedPricingSnapshot_proposalId_idx" ON "AcceptedPricingSnapshot"("proposalId");
CREATE INDEX "AcceptedPricingSnapshot_requestId_idx" ON "AcceptedPricingSnapshot"("requestId");
CREATE INDEX "AcceptedPricingSnapshot_pricingBasis_idx" ON "AcceptedPricingSnapshot"("pricingBasis");

CREATE UNIQUE INDEX "BookingGuestAmendment_stripeCheckoutSessionId_key" ON "BookingGuestAmendment"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "BookingGuestAmendment_stripePaymentIntentId_key" ON "BookingGuestAmendment"("stripePaymentIntentId");
CREATE UNIQUE INDEX "BookingGuestAmendment_idempotencyKey_key" ON "BookingGuestAmendment"("idempotencyKey");
CREATE INDEX "BookingGuestAmendment_bookingId_status_idx" ON "BookingGuestAmendment"("bookingId", "status");
CREATE INDEX "BookingGuestAmendment_paymentPlanId_idx" ON "BookingGuestAmendment"("paymentPlanId");
CREATE INDEX "BookingGuestAmendment_requesterId_idx" ON "BookingGuestAmendment"("requesterId");
CREATE INDEX "BookingGuestAmendment_amendmentType_idx" ON "BookingGuestAmendment"("amendmentType");
CREATE INDEX "BookingGuestAmendment_stripePaymentIntentId_idx" ON "BookingGuestAmendment"("stripePaymentIntentId");

ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SplitBillShare" ADD CONSTRAINT "SplitBillShare_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "PaymentInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SplitBillShare" ADD CONSTRAINT "SplitBillShare_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcceptedPricingSnapshot" ADD CONSTRAINT "AcceptedPricingSnapshot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingGuestAmendment" ADD CONSTRAINT "BookingGuestAmendment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingGuestAmendment" ADD CONSTRAINT "BookingGuestAmendment_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookingGuestAmendment" ADD CONSTRAINT "BookingGuestAmendment_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
