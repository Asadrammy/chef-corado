import fs from "fs"
import path from "path"

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("Pass B latest payment policy alignment", () => {
  it("uses the client-confirmed 5-week eligibility boundary in active public and source contracts", () => {
    const rules = readSource("lib/payment-plan-rules.ts")
    const faq = readSource("app/(public)/faq/page.tsx")

    expect(rules).toContain("CHEFACHEF_FLEXIBLE_PAYMENT_WINDOW_DAYS = 35")
    expect(faq).toContain("5 weeks / 35 days")
    expect(faq).not.toContain(["6", "weeks", "/", "42", "days"].join(" "))
    expect(faq).not.toContain(["5", "weeks", "versus", "6", "weeks"].join(" "))
  })

  it("keeps payment-plan recovery auditable and non-destructive", () => {
    const schema = readSource("prisma/schema.prisma")
    const service = readSource("lib/services/payment-plan-service.ts")

    expect(schema).toContain("recoveryStatus")
    expect(schema).toContain("supportEscalatedAt")
    expect(schema).toContain("graceEndsAt")
    expect(service).toContain("RECOVERY_REQUIRED")
    expect(service).toContain("openPaymentRecoveryTicket")
    expect(service).not.toContain("status: PAYMENT_PLAN_STATUS.CANCELLED")
  })

  it("models main-client split bill guarantor recovery", () => {
    const schema = readSource("prisma/schema.prisma")
    const service = readSource("lib/services/payment-plan-service.ts")
    const paymentPage = readSource("app/dashboard/client/proposals/[proposalId]/payment/page.tsx")

    expect(schema).toContain("guarantorUserId")
    expect(service).toContain("SPLIT_GUARANTOR_SHORTFALL")
    expect(service).toContain("MAIN_BOOKING_CLIENT")
    expect(paymentPage).toContain("you remain responsible for any guest shares")
  })

  it("requires chef-approved pricing before charging Add Guests when no explicit per-person rate exists", () => {
    const service = readSource("lib/services/booking-guest-amendment-service.ts")
    const addRoute = readSource("app/api/bookings/[id]/guest-amendments/add/route.ts")
    const chefReviewRoute = readSource("app/api/chef/bookings/[id]/guest-amendments/[amendmentId]/review/route.ts")
    const clientPayRoute = readSource("app/api/bookings/[id]/guest-amendments/[amendmentId]/checkout/route.ts")

    expect(service).toContain("CHEF_APPROVAL_REQUIRED")
    expect(service).toContain("GUEST_AMENDMENT_STATUS.CHEF_REVIEW_REQUIRED")
    expect(addRoute).toContain("chef needs to approve")
    expect(chefReviewRoute).toContain('session.user.role !== "CHEF"')
    expect(clientPayRoute).toContain('session.user.role !== "CLIENT"')
  })
})
