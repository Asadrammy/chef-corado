/// <reference types="jest" />

import { readFileSync } from "fs"
import path from "path"

const readSource = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("Phase 2 Multi-Day source contracts", () => {
  const formSource = readSource("components/multi-day-chef-hire-form.tsx")
  const schemaSource = readSource("prisma/schema.prisma")
  const validationSource = readSource("lib/validation-schemas.ts")
  const requestServiceSource = readSource("lib/services/request-service.ts")
  const proposalRouteSource = readSource("app/api/proposals/route.ts")
  const proposalServiceSource = readSource("lib/services/proposal-service.ts")
  const paymentGuaranteeSource = readSource("lib/services/payment-guarantee.ts")
  const paymentServiceSource = readSource("lib/services/payment-service.ts")
  const paymentWorkerSource = readSource("lib/queue/workers/payment-worker.ts")
  const emailSource = readSource("lib/email.ts")
  const notificationsSource = readSource("lib/notifications.ts")
  const bookingRepositorySource = readSource("lib/repositories/booking-repository.ts")
  const adminRepositorySource = readSource("lib/repositories/admin-repository.ts")
  const chefDetailSource = readSource("components/chef-request-detail.tsx")
  const clientProposalsSource = readSource("components/client-proposals-list.tsx")
  const clientBookingsSource = readSource("components/client-bookings-list.tsx")
  const chefBookingCardSource = readSource("components/dashboard/chef/chef-booking-card.tsx")
  const bookingDetailSource = readSource("app/dashboard/bookings/[id]/page.tsx")
  const adminBookingsSource = readSource("app/dashboard/admin/bookings/page.tsx")
  const adminBookingDetailSource = readSource("app/dashboard/admin/bookings/[id]/page.tsx")
  const adminSource = readSource("app/dashboard/admin/multi-day-bookings/page.tsx")

  it("uses a calendar UX with non-consecutive date toggle, range add, removal, and past-date prevention", () => {
    expect(formSource).toContain("function monthCells")
    expect(formSource).toContain("setCalendarMonth")
    expect(formSource).toContain("const disabled = isPastDate(cell.key)")
    expect(formSource).toContain("aria-pressed={selected}")
    expect(formSource).toContain("toggleDate(date)")
    expect(formSource).toContain("Add range")
    expect(formSource).toContain("Remove ${formatDateLabel(date)}")
  })

  it("collects structured per-date requirements and explicit budget mode", () => {
    expect(formSource).toContain("type BudgetMode = \"PER_DAY\" | \"TOTAL_EVENT\"")
    expect(formSource).toContain("type DayRequirementState")
    expect(formSource).toContain("dateRequirements")
    expect(formSource).toContain("budgetMode")
    expect(formSource).toContain("Daily requirements")
    expect(formSource).toContain("Budget per day")
    expect(formSource).toContain("Total budget")
  })

  it("adds only additive schema fields for structured Multi-Day data", () => {
    expect(schemaSource).toContain("budgetMode             String?")
    expect(schemaSource).toContain("defaultDailyBudget     Float?")
    expect(schemaSource).toContain("model MultiDayRequestDate")
    expect(schemaSource).toContain("serviceSpecificAnswers String?")
    expect(schemaSource).toContain("model ProposalLineItem")
    expect(schemaSource).toContain("model BookingServiceDate")
  })

  it("validates unique dates, per-day service answers, per-day max cuisines, and budget mode server-side", () => {
    expect(validationSource).toContain("Selected dates must be unique")
    expect(validationSource).toContain("Daily requirements must match the selected service dates")
    expect(validationSource).toContain("budgetModeSchema")
    expect(validationSource).toContain("validateServiceSpecificAnswers(day.serviceType")
    expect(validationSource).toContain("Select up to 3 cuisine preferences")
  })

  it("persists daily requirements in one transaction while preserving Request budget compatibility", () => {
    expect(requestServiceSource).toContain("const created = await prisma.$transaction")
    expect(requestServiceSource).toContain("requestMode: \"MULTI_DAY\"")
    expect(requestServiceSource).toContain("dateRequirements")
    expect(requestServiceSource).toContain("budgetMode: input.budgetMode")
    expect(requestServiceSource).toContain("multiDayDates: {")
    expect(requestServiceSource).toContain("sortOrder: index")
  })

  it("requires Multi-Day proposal line items without replacing the existing proposal total", () => {
    expect(proposalRouteSource).toContain("lineItems")
    expect(proposalServiceSource).toContain("MULTI_DAY_PROPOSAL_LINE_ITEMS_REQUIRED")
    expect(proposalServiceSource).toContain("MULTI_DAY_PROPOSAL_TOTAL_MISMATCH")
    expect(proposalServiceSource).toContain("lineItems.map")
    expect(chefDetailSource).toContain("lineItemTotal")
  })

  it("rechecks and persists all service dates for booking/payment compatibility", () => {
    expect(paymentGuaranteeSource).toContain("requestedServiceDates")
    expect(paymentGuaranteeSource).toContain("serviceDates: {")
    expect(paymentGuaranteeSource).toContain("datesToRelease")
    expect(paymentGuaranteeSource).toContain("date: { in: datesToRelease }")
  })

  it("surfaces structured Multi-Day details to chef and admin workspaces", () => {
    expect(chefDetailSource).toContain("Multi-Day Service Dates")
    expect(chefDetailSource).toContain("Daily breakdown")
    expect(adminSource).toContain("Cuisine:")
    expect(adminSource).toContain("Daily budget:")
    expect(adminSource).toContain("budgetMode")
  })

  it("returns structured service dates and line items through booking repositories", () => {
    expect(bookingRepositorySource).toContain("serviceDates: {")
    expect(bookingRepositorySource).toContain("lineItems: {")
    expect(bookingRepositorySource).toContain("multiDayDates: {")
    expect(adminRepositorySource).toContain("serviceDates: {")
    expect(adminRepositorySource).toContain("lineItems: {")
    expect(adminRepositorySource).toContain("budgetMode")
  })

  it("shows Multi-Day proposal line items before client acceptance", () => {
    expect(clientProposalsSource).toContain("ProposalLineItemsBreakdown")
    expect(clientProposalsSource).toContain("Daily price breakdown")
    expect(clientProposalsSource).toContain("Request type")
    expect(clientProposalsSource).toContain("Daily prices")
    expect(clientProposalsSource).toContain("Multi-Day Chef Hire")
  })

  it("shows selected service dates on client, chef, and admin booking surfaces", () => {
    expect(clientBookingsSource).toContain("formatServiceDatesCompact")
    expect(chefBookingCardSource).toContain("formatServiceDateSummary")
    expect(bookingDetailSource).toContain("Multi-Day Chef Hire")
    expect(bookingDetailSource).toContain("Daily Proposal Line Items")
    expect(adminBookingsSource).toContain("formatServiceDatesCompact")
    expect(adminBookingDetailSource).toContain("Multi-Day Service Dates")
    expect(adminBookingDetailSource).toContain("Daily proposal line items")
  })

  it("uses Multi-Day-aware emails and notifications without replacing single-day templates", () => {
    expect(emailSource).toContain("newMultiDayProposal")
    expect(emailSource).toContain("multiDayProposalAccepted")
    expect(emailSource).toContain("renderMultiDayEmailDetails")
    expect(notificationsSource).toContain("MultiDayNotificationContext")
    expect(notificationsSource).toContain("formatServiceDateSummary")
    expect(proposalServiceSource).toContain("getSafeClientGreetingName(existing.request.client)")
    expect(proposalServiceSource).toContain("emailTemplates.newMultiDayProposal")
    expect(proposalServiceSource).toContain("emailTemplates.multiDayProposalAccepted")
    expect(requestServiceSource).toContain("notifyEligibleChefsAboutRequest")
    expect(paymentServiceSource).toContain("triggerPaymentSuccessNotification")
    expect(paymentWorkerSource).toContain("Payment ${paymentAmount} confirmed")
  })
})
