import { ProposalStatus } from "@/types"
import { evaluateChefRequestMatch, type ChefRequestMatchingCandidate, type ChefRequestMatchingRequest } from "@/lib/chef-request-matching"
import { hasLockedRequestProposalStatus } from "@/lib/request-lifecycle"
import { marketConfigurationService } from "@/lib/services/market-configuration-service"
import { prisma } from "@/lib/prisma"

export const EARLY_ACCESS_WINDOW_HOURS = 24
export const EARLY_ACCESS_WINDOW_MS = EARLY_ACCESS_WINDOW_HOURS * 60 * 60 * 1000
export const MAX_QUOTES_PER_REQUEST = 10

export type ChefRequestAccessReason =
  | "CHEF_NOT_APPROVED"
  | "CHEF_BANNED"
  | "USER_BANNED"
  | "REQUEST_CLOSED"
  | "MARKET_INACTIVE"
  | "MARKET_MISMATCH"
  | "DIRECT_REQUEST_RESTRICTED"
  | "DIRECT_REQUEST_DECLINED"
  | "EARLY_ACCESS_LOCAL_ONLY"
  | "QUOTE_CAP_REACHED"
  | "DUPLICATE_PROPOSAL"
  | "CHEF_LOCATION_UNAVAILABLE"
  | "REQUEST_LOCATION_UNAVAILABLE"
  | "OUTSIDE_SERVICE_RADIUS"
  | "SERVICE_MISMATCH"
  | "CUISINE_MISMATCH"
  | "GUEST_CAPACITY_MISMATCH"
  | "AVAILABILITY_CONFLICT"

export type ChefRequestAccessResult = {
  canView: boolean
  canPropose: boolean
  local: boolean
  earlyAccess: boolean
  broaderAccess: boolean
  directRequest: boolean
  invited: boolean
  beFirstToRespond: boolean
  quoteCount: number
  quoteLimit: number
  distanceKm: number | null
  reasons: ChefRequestAccessReason[]
}

type ChefForEligibility = ChefRequestMatchingCandidate & {
  isApproved?: boolean | null
  isBanned?: boolean | null
  baseCountryCode?: string | null
  user?: ChefRequestMatchingCandidate["user"] & {
    role?: string | null
    isBanned?: boolean | null
  }
}

type RequestForEligibility = ChefRequestMatchingRequest & {
  id: string
  clientId?: string | null
  countryCode?: string | null
  createdAt?: Date | string | null
  proposals?: Array<{ chefId?: string | null; status?: string | null }>
  invitations?: Array<{ chefId?: string | null; status?: string | null }>
  _count?: { proposals?: number | null } | null
}

function toDate(value?: Date | string | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function getServiceDates(request: RequestForEligibility) {
  const multiDayDates = (request.multiDayDates ?? []).map((item) => toDate(item.date ?? null)).filter(Boolean) as Date[]
  if (multiDayDates.length > 0) return multiDayDates
  const eventDate = toDate(request.eventDate)
  return eventDate ? [eventDate] : []
}

export function isRequestOpenForQuotes(request: RequestForEligibility, now = new Date()) {
  const futureServiceDate = getServiceDates(request).some((date) => date >= now)
  return futureServiceDate && !hasLockedRequestProposalStatus(request.proposals)
}

export function isWithinEarlyAccessWindow(request: RequestForEligibility, now = new Date()) {
  const submittedAt = toDate(request.createdAt)
  if (!submittedAt) return false
  return now.getTime() - submittedAt.getTime() < EARLY_ACCESS_WINDOW_MS
}

function pushReasons(target: ChefRequestAccessReason[], reasons: string[]) {
  for (const reason of reasons) {
    if (!target.includes(reason as ChefRequestAccessReason)) {
      target.push(reason as ChefRequestAccessReason)
    }
  }
}

export async function evaluateChefRequestAccessForRecords(input: {
  chef: ChefForEligibility
  request: RequestForEligibility
  now?: Date
}): Promise<ChefRequestAccessResult> {
  const now = input.now ?? new Date()
  const { chef, request } = input
  const reasons: ChefRequestAccessReason[] = []
  const proposals = request.proposals ?? []
  const quoteCount = request._count?.proposals ?? proposals.length
  const chefProposal = proposals.find((proposal) => proposal.chefId === chef.id)
  const directInvitations = request.invitations ?? []
  const activeDirectInvitations = directInvitations.filter((invitation) => invitation.status !== "DECLINED")
  const directRequest = activeDirectInvitations.length > 0
  const invitation = activeDirectInvitations.find((item) => item.chefId === chef.id)
  const invited = Boolean(invitation)
  const earlyAccess = isWithinEarlyAccessWindow(request, now)

  if (!chef.isApproved) reasons.push("CHEF_NOT_APPROVED")
  if (chef.isBanned) reasons.push("CHEF_BANNED")
  if (chef.user?.isBanned) reasons.push("USER_BANNED")
  if (!isRequestOpenForQuotes(request, now) && !chefProposal) reasons.push("REQUEST_CLOSED")

  const market = await marketConfigurationService.getMarketConfiguration(request.countryCode)
  if (!market.bookingEnabled) reasons.push("MARKET_INACTIVE")
  if (request.countryCode && chef.baseCountryCode && request.countryCode !== chef.baseCountryCode) {
    reasons.push("MARKET_MISMATCH")
  }

  if (directRequest && !invited && !chefProposal) {
    reasons.push("DIRECT_REQUEST_RESTRICTED")
  }
  if (directInvitations.some((item) => item.chefId === chef.id && item.status === "DECLINED")) {
    reasons.push("DIRECT_REQUEST_DECLINED")
  }

  const localMatch = await evaluateChefRequestMatch(request, chef, { enforceRadius: true, enforceMarket: true })
  const broadMatch = await evaluateChefRequestMatch(request, chef, { enforceRadius: false, enforceMarket: true })

  if (!broadMatch.eligible) {
    pushReasons(reasons, broadMatch.reasons)
  }

  if (earlyAccess && !localMatch.eligible && !invited && !chefProposal) {
    reasons.push("EARLY_ACCESS_LOCAL_ONLY")
    pushReasons(reasons, localMatch.reasons)
  }

  if (quoteCount >= MAX_QUOTES_PER_REQUEST && !chefProposal) {
    reasons.push("QUOTE_CAP_REACHED")
  }

  if (chefProposal) {
    reasons.push("DUPLICATE_PROPOSAL")
  }

  const blockingReasons = reasons.filter((reason) => reason !== "DUPLICATE_PROPOSAL")
  const canView = Boolean(chefProposal) || blockingReasons.length === 0
  const canPropose = !chefProposal && reasons.length === 0

  return {
    canView,
    canPropose,
    local: localMatch.eligible,
    earlyAccess,
    broaderAccess: !earlyAccess && !localMatch.eligible && broadMatch.eligible,
    directRequest,
    invited,
    beFirstToRespond: canPropose && quoteCount === 0,
    quoteCount,
    quoteLimit: MAX_QUOTES_PER_REQUEST,
    distanceKm: localMatch.distanceKm ?? broadMatch.distanceKm,
    reasons,
  }
}

export async function getChefRequestAccess(userId: string, requestId: string, now = new Date()) {
  const [chef, request] = await Promise.all([
    prisma.chefProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true, email: true, role: true, isBanned: true } },
        menus: { select: { cuisineType: true, eventType: true } },
        experiences: { select: { serviceType: true, cuisineType: true, eventType: true, minGuests: true, maxGuests: true } },
      },
    }),
    prisma.request.findUnique({
      where: { id: requestId },
      include: {
        proposals: { select: { chefId: true, status: true } },
        invitations: { select: { chefId: true, status: true } },
        multiDayDates: { select: { date: true, serviceType: true, cuisineTypes: true, dietaryRequirements: true } },
        _count: { select: { proposals: true } },
      },
    }),
  ])

  if (!chef) throw new Error("CHEF_PROFILE_NOT_FOUND")
  if (!request) throw new Error("REQUEST_NOT_FOUND")

  return evaluateChefRequestAccessForRecords({ chef, request, now })
}

export async function assertChefCanViewRequest(userId: string, requestId: string) {
  const access = await getChefRequestAccess(userId, requestId)
  if (!access.canView) {
    const error = new Error(`REQUEST_NOT_AVAILABLE:${access.reasons.join(",")}`)
    ;(error as Error & { reasons?: string[] }).reasons = access.reasons
    throw error
  }
  return access
}

export async function assertChefCanProposeForRequest(userId: string, requestId: string) {
  const access = await getChefRequestAccess(userId, requestId)
  if (!access.canPropose) {
    const error = new Error(`REQUEST_NOT_AVAILABLE:${access.reasons.join(",")}`)
    ;(error as Error & { reasons?: string[] }).reasons = access.reasons
    throw error
  }
  return access
}
