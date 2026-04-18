-- P0 CRITICAL FIXES: Database-level safety constraints

-- 1. Prevent duplicate bookings for same proposal
-- This ensures atomicity at database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_proposal_unique ON Booking(proposalId);

-- 2. Prevent duplicate payments for same booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_booking_unique ON Payment(bookingId);

-- 3. Prevent duplicate Stripe payment intents
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_stripe_intent_unique ON Payment(stripePaymentIntentId) WHERE stripePaymentIntentId IS NOT NULL;

-- 4. Prevent duplicate Stripe charges
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_stripe_charge_unique ON Payment(stripeChargeId) WHERE stripeChargeId IS NOT NULL;

-- 5. Prevent duplicate webhook events
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_stripe_event_unique ON WebhookLog(stripeEventId);

-- 6. Capacity constraint to prevent overbooking
-- This ensures currentBookings never exceeds maxBookings
ALTER TABLE Availability ADD CONSTRAINT chk_capacity CHECK (currentBookings <= maxBookings);

-- 7. Payment status constraint to ensure valid transitions
ALTER TABLE Payment ADD CONSTRAINT chk_payment_status 
  CHECK (status IN ('HELD', 'AUTHORIZED', 'CAPTURED', 'PAID', 'RELEASED', 'REFUNDED', 'FAILED', 'DISPUTED'));

-- 8. Booking status constraint
ALTER TABLE Booking ADD CONSTRAINT chk_booking_status 
  CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'));

-- 9. Proposal status constraint
ALTER TABLE Proposal ADD CONSTRAINT chk_proposal_status 
  CHECK (status IN ('PENDING', 'ACCEPTED', 'ACCEPTED_PENDING_PAYMENT', 'REJECTED', 'BOOKED', 'EXPIRED', 'WITHDRAWN'));

-- 10. Ensure payment amounts are positive
ALTER TABLE Payment ADD CONSTRAINT chk_payment_amount_positive CHECK (totalAmount > 0);
ALTER TABLE Payment ADD CONSTRAINT chk_commission_positive CHECK (commissionAmount >= 0);
ALTER TABLE Payment ADD CONSTRAINT chk_chef_amount_positive CHECK (chefAmount >= 0);

-- 11. Ensure booking price is positive
ALTER TABLE Booking ADD CONSTRAINT chk_booking_price_positive CHECK (totalPrice > 0);

-- 12. Ensure proposal price is positive
ALTER TABLE Proposal ADD CONSTRAINT chk_proposal_price_positive CHECK (price > 0);

-- 13. Ensure availability slots are reasonable
ALTER TABLE Availability ADD CONSTRAINT chk_max_bookings_positive CHECK (maxBookings > 0);
ALTER TABLE Availability ADD CONSTRAINT chk_current_bookings_positive CHECK (currentBookings >= 0);
