-- Production financial integrity constraints.
-- Guarded for safe deploys where compatible indexes/constraints may already exist.

CREATE UNIQUE INDEX IF NOT EXISTS "idx_booking_proposal_unique"
  ON "Booking"("proposalId")
  WHERE "proposalId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_booking_unique"
  ON "Payment"("bookingId");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_stripe_intent_unique"
  ON "Payment"("stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_stripe_charge_unique"
  ON "Payment"("stripeChargeId")
  WHERE "stripeChargeId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_stripe_checkout_session_unique"
  ON "Payment"("stripeCheckoutSessionId")
  WHERE "stripeCheckoutSessionId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_webhook_stripe_event_unique"
  ON "WebhookLog"("stripeEventId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_capacity') THEN
    ALTER TABLE "Availability"
      ADD CONSTRAINT "chk_capacity" CHECK ("currentBookings" <= "maxBookings");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_status') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "chk_payment_status"
      CHECK ("status" IN ('PENDING', 'HELD', 'AUTHORIZED', 'CAPTURED', 'PAID', 'COMPLETED', 'RELEASED', 'REFUNDED', 'FAILED', 'DISPUTED'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_booking_status') THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "chk_booking_status"
      CHECK ("status" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_proposal_status') THEN
    ALTER TABLE "Proposal"
      ADD CONSTRAINT "chk_proposal_status"
      CHECK ("status" IN ('PENDING', 'ACCEPTED', 'ACCEPTED_PENDING_PAYMENT', 'REJECTED', 'BOOKED', 'COMPLETED', 'EXPIRED', 'WITHDRAWN'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_amount_positive') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "chk_payment_amount_positive" CHECK ("totalAmount" > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_commission_non_negative') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "chk_commission_non_negative" CHECK ("commissionAmount" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_chef_amount_non_negative') THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "chk_chef_amount_non_negative" CHECK ("chefAmount" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_booking_price_positive') THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "chk_booking_price_positive" CHECK ("totalPrice" > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_proposal_price_positive') THEN
    ALTER TABLE "Proposal"
      ADD CONSTRAINT "chk_proposal_price_positive" CHECK ("price" > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_max_bookings_positive') THEN
    ALTER TABLE "Availability"
      ADD CONSTRAINT "chk_max_bookings_positive" CHECK ("maxBookings" > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_bookings_non_negative') THEN
    ALTER TABLE "Availability"
      ADD CONSTRAINT "chk_current_bookings_non_negative" CHECK ("currentBookings" >= 0);
  END IF;
END $$;
