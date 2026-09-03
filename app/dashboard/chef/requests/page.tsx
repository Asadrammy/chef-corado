import { Metadata } from "next"
import { Prisma } from "@prisma/client"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { parseMarketplaceFilters, requestMatchesMarketplaceFilters } from "@/lib/chef-request-marketplace-filters"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { calculateDistance } from "@/lib/geo"
import { sortChefMarketplaceRequests } from "@/lib/chef-request-marketplace"
import { buildChefRequestView, buildChefRespondedRequestView, type ChefRequestView, type ChefRespondedRequestView } from "@/lib/chef-request-view"
import { proposalService } from "@/lib/services/proposal-service"
import { SmartMatchingService } from "@/lib/services/smart-matching-service"
import { ChefRequestsMarketplace } from "@/components/chef-requests-marketplace"
import { withRequestPhotoFallback } from "@/lib/request-photo-schema"
import { evaluateChefRequestAccessForRecords } from "@/lib/services/request-eligibility-service"
import { Role } from "@/types"

export const metadata: Metadata = generateMeta({
  title: "Incoming Requests",
  description: "Browse and respond to client requests in your area",
})

const localDemoRequests: ChefRequestView[] = [
  {
    id: "local-request-anniversary",
    title: "Anniversary dinner for 10 guests",
    eventType: "Anniversary",
    serviceType: "THREE_COURSE_MEAL",
    serviceTypeLabel: "3-Course Meal",
    serviceTier: null,
    eventDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    location: "Downtown",
    budget: 1450,
    currency: "USD",
    details: "Anniversary dinner for 10 guests with a refined seasonal tasting menu.",
    distanceKm: 6.4,
    requestMode: "STANDARD",
    clientName: "Client",
    clientGreetingName: "Client",
    eventDates: [],
    guestCount: 10,
    adultCount: null,
    childrenUnder10: null,
    actualAttendeeCount: 10,
    billableGuestCount: null,
    pricingGuestCount: null,
    description: null,
    cuisinePreferences: [],
    dietaryRequirements: [],
    serviceSpecificAnswers: null,
    serviceSpecificAnswerSummary: [],
    budgetMode: null,
    totalBudget: null,
    defaultDailyBudget: null,
    broaderMatching: false,
    photos: [],
    multiDayDates: [],
  },
  {
    id: "local-request-tasting",
    title: "Modern Italian tasting menu",
    eventType: "Dinner Party",
    serviceType: "SIX_NINE_COURSE_MEAL",
    serviceTypeLabel: "6-9-Course Meal",
    serviceTier: null,
    eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    location: "West End",
    budget: 2200,
    currency: "USD",
    details: "Modern Italian tasting menu with wine-friendly courses for a private celebration.",
    distanceKm: 11.2,
    requestMode: "STANDARD",
    clientName: "Client",
    clientGreetingName: "Client",
    eventDates: [],
    guestCount: 14,
    adultCount: null,
    childrenUnder10: null,
    actualAttendeeCount: 14,
    billableGuestCount: null,
    pricingGuestCount: null,
    description: null,
    cuisinePreferences: ["Italian"],
    dietaryRequirements: [],
    serviceSpecificAnswers: null,
    serviceSpecificAnswerSummary: [],
    budgetMode: null,
    totalBudget: null,
    defaultDailyBudget: null,
    broaderMatching: false,
    photos: [],
    multiDayDates: [],
  },
  {
    id: "local-request-brunch",
    title: "Private family brunch",
    eventType: "Family Event",
    serviceType: "BRUNCH",
    serviceTypeLabel: "Brunch",
    serviceTier: null,
    eventDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    location: "Riverside",
    budget: 980,
    currency: "USD",
    details: "Family brunch with pastries, plated mains, and relaxed tableside service.",
    distanceKm: 4.8,
    requestMode: "STANDARD",
    clientName: "Client",
    clientGreetingName: "Client",
    eventDates: [],
    guestCount: 8,
    adultCount: null,
    childrenUnder10: null,
    actualAttendeeCount: 8,
    billableGuestCount: null,
    pricingGuestCount: null,
    description: null,
    cuisinePreferences: [],
    dietaryRequirements: [],
    serviceSpecificAnswers: null,
    serviceSpecificAnswerSummary: [],
    budgetMode: null,
    totalBudget: null,
    defaultDailyBudget: null,
    broaderMatching: false,
    photos: [],
    multiDayDates: [],
  },
  {
    id: "local-request-corporate",
    title: "Executive chef's table",
    eventType: "Work Event",
    serviceType: "FOUR_FIVE_COURSE_MEAL",
    serviceTypeLabel: "4-5-Course Meal",
    serviceTier: null,
    eventDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    location: "Financial District",
    budget: 3100,
    currency: "USD",
    details: "Executive chef's table for a small corporate hospitality evening.",
    distanceKm: 13.7,
    requestMode: "STANDARD",
    clientName: "Client",
    clientGreetingName: "Client",
    eventDates: [],
    guestCount: 12,
    adultCount: null,
    childrenUnder10: null,
    actualAttendeeCount: 12,
    billableGuestCount: null,
    pricingGuestCount: null,
    description: null,
    cuisinePreferences: [],
    dietaryRequirements: [],
    serviceSpecificAnswers: null,
    serviceSpecificAnswerSummary: [],
    budgetMode: null,
    totalBudget: null,
    defaultDailyBudget: null,
    broaderMatching: false,
    photos: [],
    multiDayDates: [],
  },
]

const localDemoRespondedRequests: ChefRespondedRequestView[] = [
  buildChefRespondedRequestView({
    id: "local-proposal-anniversary",
    price: 1850,
    currency: "USD",
    status: "PENDING",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    message: "A tailored private dining proposal with menu planning, shopping, prep, service, and cleanup included.",
    request: {
      id: "local-request-anniversary",
      title: "Anniversary dinner for 10 guests",
      eventType: "Anniversary",
      requestMode: "STANDARD",
      serviceType: "THREE_COURSE_MEAL",
      serviceTypeLabel: "3-Course Meal",
      client: { id: "local-client", name: "Maya R.", firstName: "Maya" },
      location: "Downtown",
      currency: "USD",
      budget: 1450,
      eventDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      eventDates: [],
      guestCount: 10,
      actualAttendeeCount: 10,
      cuisineTypes: [],
      dietaryRequirements: [],
      serviceSpecificAnswers: null,
      serviceSpecificAnswerSummary: [],
      photos: [],
      multiDayDates: [],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  }),
]

type ChefRequestsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function toSearchParamsObject(searchParams: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))
}

export default async function ChefRequestsPage({ searchParams }: ChefRequestsPageProps) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  const userId = session.user?.id
  if (!userId) {
    redirect("/dashboard")
  }

  const resolvedSearchParams = searchParams ? await searchParams : {}
  const filters = parseMarketplaceFilters(toSearchParamsObject(resolvedSearchParams))

  let requests: ChefRequestView[] = []
  let respondedRequests: ChefRespondedRequestView[] = []
  let serviceRadiusKm = 25
  let baseLocation: string | undefined
  let useSmartMatching = false
  let totalRequestsCount = 0
  let totalRespondedCount = 0
  let pagination = {
    page: 1,
    limit: filters.limit,
    total: 0,
    totalPages: 1,
  }

  try {
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        location: true,
        latitude: true,
        longitude: true,
        radius: true,
        preferredCurrency: true,
        baseCountryCode: true,
        bio: true,
        specialties: true,
        careerStage: true,
        cuisineTypes: true,
        certifications: true,
        chefType: true,
        cuisineType: true,
        isApproved: true,
        isBanned: true,
        user: {
          select: {
            name: true,
            email: true,
            role: true,
            isBanned: true,
          },
        },
        menus: {
          select: {
            cuisineType: true,
            eventType: true,
          },
        },
        experiences: {
          select: {
            serviceType: true,
            cuisineType: true,
            eventType: true,
            minGuests: true,
            maxGuests: true,
          },
        },
      },
    })

    if (!chefProfile) {
      redirect("/dashboard/chef/profile")
    }

    if (chefProfile.radius <= 0) {
      redirect("/dashboard/chef/profile")
    }

    const openRequestSelect = Prisma.validator<Prisma.RequestSelect>()({
      id: true,
      title: true,
      eventType: true,
      requestMode: true,
      serviceType: true,
      serviceTypeLabel: true,
      serviceTier: true,
      client: {
        select: {
          name: true,
          firstName: true,
          verified: true,
        },
      },
      locationCity: true,
      formattedAddress: true,
      cuisineTypes: true,
      dietaryRequirements: true,
      serviceSpecificAnswers: true,
      eventDates: true,
      eventDate: true,
      location: true,
      budget: true,
      currency: true,
      guestCount: true,
      adultCount: true,
      childrenUnder10: true,
      actualAttendeeCount: true,
      billableGuestCount: true,
      pricingGuestCount: true,
      budgetMode: true,
      totalBudget: true,
      defaultDailyBudget: true,
      details: true,
      description: true,
      createdAt: true,
      latitude: true,
      longitude: true,
      geocodingStatus: true,
      countryCode: true,
      _count: {
        select: {
          proposals: true,
        },
      },
      proposals: {
        select: {
          chefId: true,
          status: true,
        },
      },
      invitations: {
        select: {
          chefId: true,
          status: true,
          createdAt: true,
        },
      },
      multiDayDates: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          serviceType: true,
          serviceTypeLabel: true,
          serviceTier: true,
          cuisineTypes: true,
          dietaryRequirements: true,
          adultCount: true,
          childrenUnder10: true,
          actualAttendeeCount: true,
          billableGuestCount: true,
          budget: true,
          notes: true,
          serviceNeeds: true,
        },
        orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
      },
    })

    const openRequestSelectWithPhotos = Prisma.validator<Prisma.RequestSelect>()({
      ...openRequestSelect,
      photos: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 3,
        select: {
          id: true,
          url: true,
          originalName: true,
        },
      },
    })

    const mapBoundsWhere = filters.mapNorth != null && filters.mapSouth != null && filters.mapEast != null && filters.mapWest != null
      ? {
          latitude: { gte: filters.mapSouth, lte: filters.mapNorth },
          longitude: { gte: filters.mapWest, lte: filters.mapEast },
        }
      : {}

    const [allRequests, proposalHistory] = await Promise.all([
      withRequestPhotoFallback(
        () => prisma.request.findMany({
        where: {
          ...mapBoundsWhere,
          OR: [
            { eventDate: { gte: new Date() } },
            { multiDayDates: { some: { date: { gte: new Date() } } } },
          ],
          proposals: {
            none: {
              chefId: chefProfile.id,
            },
          },
        },
        select: openRequestSelectWithPhotos,
        orderBy: [{ createdAt: "desc" }, { eventDate: "asc" }, { id: "asc" }],
        take: 250,
        }),
        () => prisma.request.findMany({
          where: {
            ...mapBoundsWhere,
            OR: [
              { eventDate: { gte: new Date() } },
              { multiDayDates: { some: { date: { gte: new Date() } } } },
            ],
            proposals: {
              none: {
                chefId: chefProfile.id,
              },
            },
          },
          select: openRequestSelect,
          orderBy: [{ createdAt: "desc" }, { eventDate: "asc" }, { id: "asc" }],
          take: 250,
        })
      ),
      proposalService.listProposals(userId, Role.CHEF)
    ])

    const allOpenRequests = (await Promise.all(allRequests.map(async (request) => {
      const access = await evaluateChefRequestAccessForRecords({
        chef: chefProfile,
        request,
      })

      if (!access.canView || request.proposals.some((proposal) => proposal.chefId === chefProfile.id)) {
        return null
      }

      const hasExactDistance =
        chefProfile.latitude != null &&
        chefProfile.longitude != null &&
        request.latitude != null &&
        request.longitude != null

      const distanceKm = hasExactDistance
        ? Math.round(
            calculateDistance(
              chefProfile.latitude as number,
              chefProfile.longitude as number,
              request.latitude as number,
              request.longitude as number
            ) * 10
          ) / 10
        : null

      return buildChefRequestView({
        ...request,
        client: request.client,
        createdAt: request.createdAt,
        submittedAt: request.createdAt,
        totalProposalCount: access.quoteCount,
        earlyAccess: access.earlyAccess && access.local,
        directRequest: access.directRequest && access.invited,
        beFirstToRespond: access.beFirstToRespond,
        canSubmitProposal: access.canPropose,
      }, {
        distanceKm: access.distanceKm != null ? Math.round(access.distanceKm * 10) / 10 : distanceKm,
        broaderMatching: access.broaderAccess || distanceKm == null,
      })
    }))).filter(Boolean) as ChefRequestView[]

    const allRespondedRequests = proposalHistory.map((proposal) => buildChefRespondedRequestView(proposal, {
      distanceKm: proposal.request?.latitude != null && proposal.request?.longitude != null && chefProfile.latitude != null && chefProfile.longitude != null
        ? Math.round(
            calculateDistance(
              chefProfile.latitude as number,
              chefProfile.longitude as number,
              proposal.request.latitude as number,
              proposal.request.longitude as number
            ) * 10
          ) / 10
        : null,
      broaderMatching: proposal.request?.latitude == null || proposal.request?.longitude == null,
    }))

    const marketCurrency = chefProfile.preferredCurrency || "GBP"

    const filteredOpenRequests = allOpenRequests.filter((request) =>
      requestMatchesMarketplaceFilters(request, filters, {
        chefRadiusKm: chefProfile.radius,
        marketCurrency,
      })
    )

    const filteredRespondedRequests = allRespondedRequests.filter((request) =>
      requestMatchesMarketplaceFilters(request, filters, {
        chefRadiusKm: chefProfile.radius,
        marketCurrency,
      })
    )

    const smartMatches = filters.sort === "match-score" && chefProfile.latitude != null && chefProfile.longitude != null
      ? await SmartMatchingService.batchCalculateMatches(
          filteredOpenRequests.map((request) => ({
            id: request.id,
            budget: request.budget,
            eventDate: new Date(request.eventDate),
            requestDates: request.requestMode === "MULTI_DAY" ? (request.multiDayDates ?? []).filter(Boolean).map((date) => new Date(date.date)) : [new Date(request.eventDate)],
            serviceType: request.serviceType,
            eventType: request.eventType,
            cuisineTypes: request.cuisinePreferences,
            dietaryRequirements: request.dietaryRequirements,
            pricingGuestCount: request.pricingGuestCount,
            details: request.details,
            latitude: request.latitude ?? null,
            longitude: request.longitude ?? null,
          })), chefProfile.id)
      : []

    const smartMatchMap = new Map(smartMatches.map((match) => [match.requestId, match]))

    const sortedOpenRequests = sortChefMarketplaceRequests(
      filteredOpenRequests.map((request) => ({
        ...request,
        matchData: smartMatchMap.get(request.id),
      })),
      filters.sort,
      {
        getMatchScore: (request) => request.matchData?.matchScore,
      }
    )

    const sortedRespondedRequests = sortChefMarketplaceRequests(filteredRespondedRequests, filters.sort, {
      getMatchScore: () => null,
    })

    totalRequestsCount = sortedOpenRequests.length
    totalRespondedCount = sortedRespondedRequests.length

    const activeRequests = filters.tab === "responded" ? sortedRespondedRequests : sortedOpenRequests
    const totalPages = Math.max(1, Math.ceil(activeRequests.length / filters.limit))
    const currentPage = Math.min(Math.max(filters.page, 1), totalPages)
    const start = (currentPage - 1) * filters.limit
    const end = start + filters.limit
    pagination = {
      page: currentPage,
      limit: filters.limit,
      total: activeRequests.length,
      totalPages,
    }

    requests = filters.tab === "requests"
      ? sortedOpenRequests.slice(start, end)
      : []

    respondedRequests = filters.tab === "responded"
      ? sortedRespondedRequests.slice(start, end)
      : []

    serviceRadiusKm = chefProfile.radius
    baseLocation = chefProfile.location || undefined
    useSmartMatching = chefProfile.latitude != null && chefProfile.longitude != null
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      requests = localDemoRequests
      respondedRequests = localDemoRespondedRequests
      serviceRadiusKm = 25
      baseLocation = "Local demo kitchen"
      useSmartMatching = false
    } else {
      throw error
    }
  }

  return (
    <ChefRequestsMarketplace
      requests={requests}
      respondedRequests={respondedRequests}
      totalRequestsCount={totalRequestsCount}
      totalRespondedCount={totalRespondedCount}
      pagination={pagination}
      serviceRadiusKm={serviceRadiusKm}
      baseLocation={baseLocation}
      useSmartMatching={useSmartMatching}
    />
  )
}
