import { evaluateChefRequestMatch } from "@/lib/chef-request-matching"
import { checkChefCompliance } from "@/lib/security/legal-compliance"
import { marketConfigurationService } from "@/lib/services/market-configuration-service"
import {
  evaluateChefRequestAccessForRecords,
  isRequestOpenForQuotes,
  isWithinEarlyAccessWindow,
  MAX_QUOTES_PER_REQUEST,
} from "@/lib/services/request-eligibility-service"
import { prisma } from "@/lib/prisma"

export type EligibilityDiagnosticCheck = {
  check: string
  value: string | number | boolean | null
  pass: boolean
  consequence: string
}

export type EligibilityDiagnostic = {
  chefProfileId: string
  requestId: string
  canView: boolean
  canPropose: boolean
  reasons: string[]
  checks: EligibilityDiagnosticCheck[]
}

function pass(check: string, value: EligibilityDiagnosticCheck["value"], consequence = "Eligible path remains open") {
  return { check, value, pass: true, consequence }
}

function fail(check: string, value: EligibilityDiagnosticCheck["value"], consequence: string) {
  return { check, value, pass: false, consequence }
}

export async function buildChefRequestEligibilityDiagnostic(
  chefUserId: string,
  requestId: string,
  now = new Date()
): Promise<EligibilityDiagnostic> {
  const [chef, request] = await Promise.all([
    prisma.chefProfile.findUnique({
      where: { userId: chefUserId },
      include: {
        user: { select: { name: true, role: true, isBanned: true } },
        menus: { select: { cuisineType: true, eventType: true } },
        experiences: { select: { serviceType: true, cuisineType: true, eventType: true, minGuests: true, maxGuests: true } },
      },
    }),
    prisma.request.findUnique({
      where: { id: requestId },
      include: {
        proposals: { select: { chefId: true, status: true } },
        invitations: { select: { chefId: true, status: true, createdAt: true } },
        multiDayDates: { select: { date: true, serviceType: true, cuisineTypes: true, dietaryRequirements: true } },
        _count: { select: { proposals: true } },
      },
    }),
  ])

  if (!chef) throw new Error("CHEF_PROFILE_NOT_FOUND")
  if (!request) throw new Error("REQUEST_NOT_FOUND")

  const [access, localMatch, broadMatch, market, compliance] = await Promise.all([
    evaluateChefRequestAccessForRecords({ chef, request, now }),
    evaluateChefRequestMatch(request, chef, { enforceRadius: true, enforceMarket: true }),
    evaluateChefRequestMatch(request, chef, { enforceRadius: false, enforceMarket: true }),
    marketConfigurationService.getMarketConfiguration(request.countryCode),
    checkChefCompliance(chefUserId),
  ])

  const quoteCount = request._count?.proposals ?? request.proposals.length
  const chefProposal = request.proposals.some((proposal) => proposal.chefId === chef.id)
  const checks: EligibilityDiagnosticCheck[] = [
    chef.isApproved ? pass("approval", true) : fail("approval", false, "Chef is hidden from request eligibility"),
    chef.isBanned ? fail("chef ban", true, "Chef is hidden from request eligibility") : pass("chef ban", false),
    chef.user?.isBanned ? fail("user ban", true, "User account is hidden from request eligibility") : pass("user ban", false),
    market.bookingEnabled ? pass("market", market.countryCode) : fail("market", market.countryCode, "Requests in inactive markets cannot transact"),
    request.countryCode === chef.baseCountryCode
      ? pass("market match", request.countryCode)
      : fail("market match", `${request.countryCode ?? "unknown"}:${chef.baseCountryCode ?? "unknown"}`, "Chef and request markets differ"),
    chef.latitude != null && chef.longitude != null
      ? pass("chef coordinates", true)
      : fail("chef coordinates", false, "Local-radius matching cannot prove this chef is in range"),
    request.latitude != null && request.longitude != null
      ? pass("request coordinates", true)
      : fail("request coordinates", false, "Local-radius matching cannot prove this request is in range"),
    localMatch.distanceKm == null || localMatch.local
      ? pass("radius", localMatch.distanceKm)
      : fail("radius", localMatch.distanceKm, "Chef is outside the saved service radius"),
    localMatch.reasons.includes("AVAILABILITY_CONFLICT")
      ? fail("availability", false, "Date is explicitly unavailable, full, or already booked")
      : pass("availability", true),
    localMatch.reasons.includes("SERVICE_MISMATCH")
      ? fail("service", false, "Chef service evidence does not match request service")
      : pass("service", true),
    localMatch.reasons.includes("CUISINE_MISMATCH")
      ? fail("cuisine", false, "Chef cuisine evidence does not match request cuisine")
      : pass("cuisine", true),
    localMatch.reasons.includes("GUEST_CAPACITY_MISMATCH")
      ? fail("capacity", false, "Guest count is outside matching service capacity")
      : pass("capacity", true),
    compliance.canProceed
      ? pass("certificate/compliance", true)
      : fail("certificate/compliance", compliance.blockingReason ?? false, "Chef can be blocked from quote/message actions"),
    isWithinEarlyAccessWindow(request, now) && !localMatch.eligible && !chefProposal
      ? fail("24h early access", true, "Only eligible local chefs can view during the first 24 hours")
      : pass("24h early access", isWithinEarlyAccessWindow(request, now)),
    access.directRequest && !access.invited && !access.canView && broadMatch.eligible
      ? fail("direct request", true, "Direct request exclusivity or local release rules block this chef")
      : pass("direct request", access.directRequest),
    quoteCount < MAX_QUOTES_PER_REQUEST || chefProposal
      ? pass("quote cap", `${quoteCount}/${MAX_QUOTES_PER_REQUEST}`)
      : fail("quote cap", `${quoteCount}/${MAX_QUOTES_PER_REQUEST}`, "Request has reached the quote cap"),
    isRequestOpenForQuotes(request, now) || chefProposal
      ? pass("request open", true)
      : fail("request open", false, "Request is not open for new quotes"),
  ]

  return {
    chefProfileId: chef.id,
    requestId: request.id,
    canView: access.canView,
    canPropose: access.canPropose,
    reasons: access.reasons,
    checks,
  }
}
