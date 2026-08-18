import { readFileSync } from "fs"
import path from "path"

const root = process.cwd()
const readSource = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

describe("multi-day payment finalization parity", () => {
  it("routes checkout, payment-intent success, and reconciliation through the payment guarantee service", () => {
    const paymentService = readSource("lib/services/payment-service.ts")
    const webhookHandler = readSource("lib/services/stripe-webhook-handler.ts")
    const reconciliation = readSource("lib/services/payment-reconciliation.ts")

    expect(paymentService).toContain("guaranteePaymentToBooking")
    expect(webhookHandler).toContain("guaranteePaymentToBooking")
    expect(reconciliation).toContain("guaranteePaymentToBooking")
  })

  it("keeps booking finalization responsible for service dates, one chef, availability, and idempotency", () => {
    const guarantee = readSource("lib/services/payment-guarantee.ts")

    expect(guarantee).toContain("request: { include: { multiDayDates: true } }")
    expect(guarantee).toContain("serviceDates: {")
    expect(guarantee).toContain("chefId: proposal.chefId")
    expect(guarantee).toContain("currentBookings")
    expect(guarantee).toContain("existingBooking")
    expect(guarantee).toContain("releaseProposalCheckoutLocks")
  })

  it("does not duplicate proposal booking creation in alternate successful payment paths", () => {
    const webhookHandler = readSource("lib/services/stripe-webhook-handler.ts")
    const reconciliation = readSource("lib/services/payment-reconciliation.ts")

    expect(webhookHandler).not.toContain("tx.booking.create")
    expect(reconciliation).not.toContain("tx.booking.create")
    expect(webhookHandler).not.toContain("tx.payment.create")
    expect(reconciliation).not.toContain("tx.payment.create")
  })

  it("keeps checkout locks until success, failure, cancellation, expiry, or TTL cleanup", () => {
    const checkout = readSource("app/api/payments/checkout/route.ts")
    const webhookHandler = readSource("lib/services/stripe-webhook-handler.ts")
    const locks = readSource("lib/services/proposal-checkout-locks.ts")

    expect(checkout).toContain("acquireProposalCheckoutLocks")
    expect(checkout).toContain("releaseLocksOnExit = false")
    expect(checkout).toContain("expires_at")
    expect(webhookHandler).toContain("releaseProposalCheckoutLocks")
    expect(locks).toContain("cleanupExpiredProposalCheckoutLocks")
    expect(locks).toContain("PROPOSAL_CHECKOUT_LOCK_TYPE")
  })
})
