import fs from "fs"
import path from "path"

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("Pass 2 payment and amendment source contracts", () => {
  it("keeps plan-tagged payment intents out of the legacy full-payment guarantee path", () => {
    const webhook = readSource("lib/services/stripe-webhook-handler.ts")
    const reconciliation = readSource("lib/services/payment-reconciliation.ts")

    expect(webhook).toContain("paymentIntent.metadata?.paymentPlanId")
    expect(webhook).toContain("processPlanPaymentIntentSucceeded")
    expect(reconciliation).toContain("paymentIntent.metadata?.paymentPlanId")
    expect(reconciliation).toContain("not reconciled through legacy Payment")
  })

  it("uses one server-side 35-day eligibility function for the flexible-payment window", () => {
    const checkout = readSource("app/api/payments/checkout/route.ts")
    const validation = readSource("app/api/payments/validate/[proposalId]/route.ts")
    const rules = readSource("lib/payment-plan-rules.ts")

    expect(rules).toContain("DEFAULT_FLEXIBLE_PAYMENT_WINDOW_DAYS = 35")
    expect(rules).toContain("CHEFACHEF_FLEXIBLE_PAYMENT_WINDOW_DAYS = 35")
    expect(rules).toContain("> FLEXIBLE_PAYMENT_WINDOW_DAYS")
    expect(rules).toContain("getPaymentEligibility")
    expect(checkout).toContain("paymentPlanService.createOrReusePlan")
    expect(validation).toContain("paymentPlanService.getEligibilityForProposal")
  })

  it("uses the latest 20/80 default deposit policy", () => {
    const rules = readSource("lib/payment-plan-rules.ts")
    const checkout = readSource("app/api/payments/checkout/route.ts")
    const paymentPage = readSource("app/dashboard/client/proposals/[proposalId]/payment/page.tsx")

    expect(rules).toContain("STANDARD_DEPOSIT_BASIS_POINTS = 2000")
    expect(checkout).toContain("20% deposit")
    expect(paymentPage).toContain("20% Deposit")
    expect(paymentPage).not.toContain("10% Deposit")
  })

  it("models financial events without replacing the legacy Payment record", () => {
    const schema = readSource("prisma/schema.prisma")

    expect(schema).toContain("model PaymentPlan")
    expect(schema).toContain("model PaymentInstallment")
    expect(schema).toContain("model SplitBillShare")
    expect(schema).toContain("model BookingGuestAmendment")
    expect(schema).toContain("payments                   Payment?")
  })

  it("keeps guest reduction admin-only and client Add Guests add-only", () => {
    const addRoute = readSource("app/api/bookings/[id]/guest-amendments/add/route.ts")
    const reduceRoute = readSource("app/api/admin/bookings/[id]/guest-amendments/reduce/route.ts")
    const chat = readSource("components/chat/chat-window.tsx")

    expect(addRoute).toContain('session.user.role !== "CLIENT"')
    expect(addRoute).toContain("addedAdultCount")
    expect(addRoute).not.toContain("removeAdultCount")
    expect(reduceRoute).toContain('requireAdminPermission("bookings.modify")')
    expect(chat).toContain("APPROVED_PUBLIC_CONTACT.email")
  })

  it("exposes due-balance processing only through a cron-secret protected route", () => {
    const route = readSource("app/api/cron/process-payment-balances/route.ts")
    const service = readSource("lib/services/payment-plan-service.ts")

    expect(route).toContain("CRON_SECRET")
    expect(route).toContain("Bearer")
    expect(route).toContain("processDueBalanceCharges")
    expect(service).toContain("off_session: true")
    expect(service).toContain('generateIdempotencyKey("BALANCE_ATTEMPT"')
    expect(service).not.toContain("idempotencyKey: installment.idempotencyKey")
    expect(service).toContain("ALREADY_PROCESSING_OR_PAID")
    expect(service).toContain("markPlanRecoveryRequired")
  })

  it("verifies Stripe amount and currency before marking plan installments paid", () => {
    const service = readSource("lib/services/payment-plan-service.ts")
    const checkout = readSource("app/api/payments/checkout/route.ts")
    const splitShareCheckout = readSource("app/api/payments/split-shares/[token]/checkout/route.ts")
    const instantCheckout = readSource("app/api/bookings/instant/payment/route.ts")
    const instantAtomicCheckout = readSource("app/api/bookings/instant/payment-atomic/route.ts")
    const addGuestsCheckout = readSource("app/api/bookings/[id]/guest-amendments/add/route.ts")

    expect(service).toContain("STRIPE_AMOUNT_MISMATCH")
    expect(service).toContain("STRIPE_CURRENCY_MISMATCH")
    expect(service).toContain("amount_total")
    expect(service).toContain("paymentIntent.currency")
    expect(checkout).toContain("currency: currency.toLowerCase()")
    expect(splitShareCheckout).toContain("currency: share.currency.toLowerCase()")
    expect(instantCheckout).toContain("currency: currency.toLowerCase()")
    expect(instantAtomicCheckout).toContain("currency: normalizeCurrency((result.booking as any).currency || 'GBP').toLowerCase()")
    expect(addGuestsCheckout).toContain("currency: amendment.currency.toLowerCase()")
  })

  it("rejects placeholder Stripe keys through the shared Stripe service", () => {
    const stripeService = readSource("lib/services/stripe-service.ts")

    expect(stripeService).toContain("StripeService.validateConfigured()")
    expect(stripeService).toContain("sk_test_placeholder")
    expect(stripeService).toContain("sk_live_placeholder")
  })

  it("provides a guest-facing split bill page instead of exposing only a JSON checkout route", () => {
    const checkout = readSource("app/api/payments/checkout/route.ts")
    const sharePage = readSource("app/payment/split-bill/[token]/page.tsx")
    const shareDetails = readSource("app/api/payments/split-shares/[token]/route.ts")

    expect(checkout).toContain("/payment/split-bill/")
    expect(checkout).toContain("SPLIT_BILL_CREATED")
    expect(sharePage).toContain("Your share")
    expect(sharePage).toContain("/api/payments/split-shares/")
    expect(shareDetails).toContain("hashSecureToken")
    expect(shareDetails).toContain("tokenHash")
  })

  it("keeps split bill amounts server-authoritative and exact", () => {
    const checkout = readSource("app/api/payments/checkout/route.ts")
    const rules = readSource("lib/payment-plan-rules.ts")
    const service = readSource("lib/services/payment-plan-service.ts")

    expect(checkout).toContain("splitShares")
    expect(rules).toContain("sumMinorUnits")
    expect(service).toContain("SPLIT_SHARES_MUST_EQUAL_TOTAL")
    expect(service).toContain("splitEvenly")
    expect(service).toContain("guarantorUserId")
    expect(service).toContain("processSplitBillGuarantorShortfalls")
  })

  it("requires successful Add Guests payment before booking guest counts change", () => {
    const service = readSource("lib/services/booking-guest-amendment-service.ts")

    expect(service).toContain("requestAddGuests")
    expect(service).toContain("processAddGuestCheckoutSessionCompleted")
    expect(service.indexOf("processAddGuestCheckoutSessionCompleted")).toBeLessThan(service.indexOf("tx.booking.update"))
    expect(service).toContain("incrementalAmountMinor")
    expect(service).toContain("STRIPE_AMOUNT_MISMATCH")
    expect(service).toContain("STRIPE_CURRENCY_MISMATCH")
    expect(service).toContain("claim.count")
  })

  it("does not use accepted-average pricing for Add Guests after latest client decision", () => {
    const snapshotService = readSource("lib/services/payment-plan-service.ts")
    const amendmentService = readSource("lib/services/booking-guest-amendment-service.ts")

    expect(snapshotService).not.toContain("ACCEPTED_AVERAGE_PER_PRICING_GUEST")
    expect(amendmentService).toContain("CHEF_APPROVAL_REQUIRED")
    expect(amendmentService).toContain("reviewAddGuestsByChef")
  })
})
