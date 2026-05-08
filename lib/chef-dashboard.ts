import { prisma } from "@/lib/prisma"
import { calculateDistance } from "@/lib/geo"
import { subDays } from "date-fns"

export type ChefDashboardRequestItem = {
  id: string
  title: string
  budget: number
  currency?: string
  clientName?: string
  location?: string
  createdAt: string
  eventDate?: string
  distanceKm?: number
}

export type ChefDashboardData = {
  totalEarnings: number
  activeBookings: number
  availableRequests: number
  completedBookings: number
  averageRating: number
  quotesSentToday: number
  quotesTarget: number
  menusCount: number
  menusTarget: number
  /** @deprecated Use messageResponseRate and proposalResponseRate instead */
  responseRate: number
  responseRateWindowDays: 7 | 30
  responseRateSevenDay: number
  responseRateThirtyDay: number
  avgResponseTimeMinutes: number | null
  /** Message response rate: % of client messages that received a chef reply within 24 hours */
  messageResponseRate: number
  /** Proposal response rate: % of requests in radius that received proposals */
  proposalResponseRate: number
  /** Total requests received in the last 7 days within radius */
  requestsReceivedWeek: number
  /** Total proposals sent in the last 7 days */
  proposalsSentWeek: number
  /** Detailed message response metrics */
  messageMetrics: {
    sevenDayTotal: number
    sevenDayResponded: number
    thirtyDayTotal: number
    thirtyDayResponded: number
  }
  profile: unknown
  profileCompletion: number
  approvalStatus: string
  requests: ChefDashboardRequestItem[]
  proposals: unknown[]
  bookings: unknown[]
  experiences: unknown[]
  reviews: unknown[]
  earningsData: Array<{ month: string; earnings: number }>
  earningsTrend: Array<{ date: string; earnings: number }>
  /** KPI trends for the last 14 days */
  kpiTrends: Array<{
    date: string
    quotesSent: number
    proposalsAccepted: number
    proposalsRejected: number
    earnings: number
  }>
  kpiSummary: {
    totalQuotesSent: number
    totalProposalsAccepted: number
    totalProposalsRejected: number
    totalEarnings: number
    quotesTrend: number
    acceptanceRate: number
  }
  pendingTasks: Array<{
    id: string
    title: string
    description: string
    href: string
    priority: "high" | "medium" | "low"
  }>
}

type DashboardBooking = {
  id: string
  createdAt: Date
  eventDate: Date
  status: string
  totalPrice: number
  bookingType: string
  location: string
  guestCount: number
  payments: {
    totalAmount: number
    commissionAmount: number
    chefAmount: number
    status: string
    releasedAt: Date | null
  } | null
  client: {
    id: string
    name: string
    email: string
  }
  proposal: {
    id: string
    request: {
      id: string
      title: string | null
      eventDate: Date
      location: string
      details: string | null
    } | null
  } | null
  experience: {
    id: string
    title: string
  } | null
}

function getBookingEarnings(booking: DashboardBooking) {
  return booking.payments?.status === "COMPLETED"
    ? booking.payments?.chefAmount || 0
    : 0
}

function isBookingActive(status: string) {
  return ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(status)
}

function isBookingCompleted(booking: DashboardBooking) {
  return booking.status === "COMPLETED" && booking.payments?.status === "COMPLETED"
}

/**
 * Calculate true response rate based on actual message replies.
 * Response rate = % of client messages that received a chef reply within 24 hours.
 * Also calculates average response time in minutes.
 *
 * Business Logic:
 * - Only counts responses within 24 hours for the rate
 * - Handles conversations properly (latest client message needs response)
 * - Avoids double counting by tracking unique client messages
 */
type MessageResponseData = {
  id: string
  senderId: string
  receiverId: string
  createdAt: Date
}

type ResponseMetrics = {
  responseRate: number
  avgResponseTimeMinutes: number | null
  totalMessages: number
  respondedMessages: number
}

function calculateMessageResponseMetrics(
  messagesToChef: MessageResponseData[],
  messagesFromChef: MessageResponseData[],
  since: Date
): ResponseMetrics {
  // Filter messages within the time window
  const recentMessagesToChef = messagesToChef.filter((msg) => msg.createdAt >= since)

  if (recentMessagesToChef.length === 0) {
    return { responseRate: 0, avgResponseTimeMinutes: null, totalMessages: 0, respondedMessages: 0 }
  }

  const RESPONSE_THRESHOLD_MINUTES = 24 * 60 // 24 hours in minutes
  const responseTimes: number[] = []
  const respondedMessageIds = new Set<string>()

  // Sort chef messages by date for efficient lookup
  const sortedChefMessages = [...messagesFromChef].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )

  // For each message sent to the chef, check if chef replied within 24 hours
  for (const clientMessage of recentMessagesToChef) {
    // Find the first chef reply to this client that happened AFTER the client message
    // AND within 24 hours
    const responseDeadline = new Date(
      clientMessage.createdAt.getTime() + RESPONSE_THRESHOLD_MINUTES * 60 * 1000
    )

    const chefReply = sortedChefMessages.find(
      (chefMsg) =>
        chefMsg.receiverId === clientMessage.senderId &&
        chefMsg.createdAt > clientMessage.createdAt &&
        chefMsg.createdAt <= responseDeadline
    )

    if (chefReply) {
      respondedMessageIds.add(clientMessage.id)

      // Calculate response time in minutes
      const responseTimeMs = chefReply.createdAt.getTime() - clientMessage.createdAt.getTime()
      const responseTimeMinutes = responseTimeMs / (1000 * 60)
      responseTimes.push(responseTimeMinutes)
    }
  }

  // Response rate = only responses within 24 hours count
  const responseRate = (respondedMessageIds.size / recentMessagesToChef.length) * 100

  // Calculate average response time (already filtered to 24h responses)
  const avgResponseTimeMinutes =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : null

  return {
    responseRate: Math.round(responseRate * 10) / 10,
    avgResponseTimeMinutes: avgResponseTimeMinutes ? Math.round(avgResponseTimeMinutes) : null,
    totalMessages: recentMessagesToChef.length,
    respondedMessages: respondedMessageIds.size,
  }
}

/**
 * Calculate proposal response rate based on requests received vs proposals sent.
 * This is a separate metric from message response rate.
 *
 * Business Logic:
 * - Counts requests within chef's radius in the last 7 days
 * - Calculates % of those requests that received proposals from this chef
 */
function calculateProposalResponseMetrics(
  requestsInRadius: Array<{ id: string; proposals: Array<{ id: string }> }>,
  proposalsLastWeek: number
): { responseRate: number; requestsReceived: number; proposalsSent: number } {
  const requestsReceived = requestsInRadius.length

  if (requestsReceived === 0) {
    return { responseRate: 0, requestsReceived: 0, proposalsSent: proposalsLastWeek }
  }

  const requestsWithProposal = requestsInRadius.filter((r) => r.proposals.length > 0).length
  const responseRate = Math.round((requestsWithProposal / requestsReceived) * 100 * 10) / 10

  return {
    responseRate,
    requestsReceived,
    proposalsSent: proposalsLastWeek,
  }
}

export async function getChefDashboardData(userId: string): Promise<ChefDashboardData | null> {
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          verified: true,
        },
      },
    },
  })

  if (!chefProfile) {
    return null
  }

  // Pre-calculate date ranges for queries
  const sevenDaysAgo = subDays(new Date(), 7)

  const [requests, proposals, bookings, experiences, reviews, availabilityCount, menus, messagesToChef, messagesFromChef, allRequestsWithinRadius] = await Promise.all([
    prisma.request.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        eventDate: { gte: new Date() },
        proposals: {
          none: {
            chefId: chefProfile.id,
          },
        },
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { eventDate: "asc" },
      take: 100,
    }),
    prisma.proposal.findMany({
      where: { chefId: chefProfile.id },
      include: {
        request: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { chefId: chefProfile.id },
      include: {
        payments: true,
        client: true,
        proposal: {
          include: {
            request: true,
          },
        },
        experience: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.experience.findMany({
      where: { chefId: chefProfile.id, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.findMany({
      where: { chefId: chefProfile.id },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.availability.count({
      where: {
        chefId: chefProfile.id,
        isAvailable: true,
      },
    }),
    prisma.menu.findMany({
      where: { chefId: chefProfile.id },
      select: { id: true },
    }),
    // Messages sent to this chef (from clients)
    prisma.message.findMany({
      where: {
        receiverId: userId,
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    // Messages sent by this chef (to clients)
    prisma.message.findMany({
      where: {
        senderId: userId,
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    // All requests within radius for last 7 days (for proposal response rate calculation)
    prisma.request.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        proposals: {
          where: { chefId: chefProfile.id },
          select: { id: true },
        },
      },
    }),
  ])

  const availableRequests = requests
    .filter((request) => {
      if (
        chefProfile.latitude == null ||
        chefProfile.longitude == null ||
        request.latitude == null ||
        request.longitude == null
      ) {
        return false
      }

      const distanceKm = calculateDistance(
        chefProfile.latitude,
        chefProfile.longitude,
        request.latitude,
        request.longitude
      )

      return distanceKm <= chefProfile.radius
    })
    .map((request) => ({
      distanceKm:
        chefProfile.latitude != null &&
        chefProfile.longitude != null &&
        request.latitude != null &&
        request.longitude != null
          ? Math.round(
              calculateDistance(
                chefProfile.latitude,
                chefProfile.longitude,
                request.latitude,
                request.longitude
              ) * 10
            ) / 10
          : undefined,
      id: request.id,
      title: request.title ?? "Untitled request",
      budget: request.budget,
      currency: request.currency,
      clientName: request.client?.name,
      location: request.location,
      createdAt: request.createdAt.toISOString(),
      eventDate: request.eventDate.toISOString(),
    }))

  const completedBookings = bookings.filter(isBookingCompleted)

  const activeBookings = bookings.filter((booking) => isBookingActive(booking.status)).length

  const totalEarnings = completedBookings.reduce(
    (sum, booking) => sum + getBookingEarnings(booking),
    0
  )

  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const endOfToday = new Date(startOfToday)
  endOfToday.setDate(endOfToday.getDate() + 1)

  const quotesSentToday = proposals.filter((proposal) => {
    return proposal.createdAt >= startOfToday && proposal.createdAt < endOfToday
  }).length

  const menusCount = menus.length
  // Configurable targets via environment variables (defaults: 10 quotes, 5 menus)
  const quotesTarget = parseInt(process.env.CHEF_QUOTES_TARGET || '10', 10)
  const menusTarget = parseInt(process.env.CHEF_MENUS_TARGET || '5', 10)
  const thirtyDaysAgo = subDays(new Date(), 30)

  // Calculate true response rate based on actual message replies
  const sevenDayMetrics = calculateMessageResponseMetrics(
    messagesToChef as MessageResponseData[],
    messagesFromChef as MessageResponseData[],
    sevenDaysAgo
  )
  const thirtyDayMetrics = calculateMessageResponseMetrics(
    messagesToChef as MessageResponseData[],
    messagesFromChef as MessageResponseData[],
    thirtyDaysAgo
  )

  const responseRateSevenDay = sevenDayMetrics.responseRate
  const responseRateThirtyDay = thirtyDayMetrics.responseRate
  const responseRateWindowDays: 7 | 30 = responseRateSevenDay > 0 ? 7 : 30
  const responseRate = responseRateWindowDays === 7 ? responseRateSevenDay : responseRateThirtyDay
  const avgResponseTimeMinutes = responseRateWindowDays === 7
    ? sevenDayMetrics.avgResponseTimeMinutes
    : thirtyDayMetrics.avgResponseTimeMinutes

  // Calculate proposal response rate: % of requests within radius that received proposals
  // Filter requests within chef's radius
  const requestsInRadius = allRequestsWithinRadius.filter((request) => {
    if (
      chefProfile.latitude == null ||
      chefProfile.longitude == null ||
      request.latitude == null ||
      request.longitude == null
    ) {
      return false
    }
    const distanceKm = calculateDistance(
      chefProfile.latitude,
      chefProfile.longitude,
      request.latitude,
      request.longitude
    )
    return distanceKm <= chefProfile.radius
  })

  // Calculate proposal response rate using helper function
  const requestsReceivedWeek = requestsInRadius.length
  const proposalsSentWeek = proposals.filter((proposal) => proposal.createdAt >= sevenDaysAgo).length
  const proposalMetrics = calculateProposalResponseMetrics(
    requestsInRadius,
    proposalsSentWeek
  )
  const proposalResponseRate = proposalMetrics.responseRate

  // Message response rate is the rate from sevenDayMetrics (or thirtyDay if 7-day is 0)
  const messageResponseRate = responseRate

  // Additional response metrics for detailed display
  const messageMetrics = {
    sevenDayTotal: sevenDayMetrics.totalMessages,
    sevenDayResponded: sevenDayMetrics.respondedMessages,
    thirtyDayTotal: thirtyDayMetrics.totalMessages,
    thirtyDayResponded: thirtyDayMetrics.respondedMessages,
  }

  const profileCompletionChecks = {
    hasProfile: true,
    hasBio: !!chefProfile.bio,
    hasExperience: typeof chefProfile.experience === "number" && chefProfile.experience > 0,
    hasLocation: !!chefProfile.location,
    hasExperiences: experiences.length > 0,
    hasAvailability: availabilityCount > 0,
    hasCuisineType: !!chefProfile.cuisineType,
    hasProfileImage: !!chefProfile.profileImage,
  }

  const profileCompletion = Math.round(
    (Object.values(profileCompletionChecks).filter(Boolean).length /
      Object.keys(profileCompletionChecks).length) *
      100
  )

  const earningsByMonth = new Map<string, number>()
  completedBookings.forEach((booking) => {
    const monthKey = booking.createdAt.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })

    const current = earningsByMonth.get(monthKey) || 0
    earningsByMonth.set(monthKey, current + getBookingEarnings(booking))
  })

  const earningsData = Array.from(earningsByMonth.entries()).map(([monthKey, earnings]) => ({
    month: monthKey,
    earnings: Math.round(earnings * 100) / 100,
  }))

  const today = new Date()
  const thirteenDaysAgo = new Date(today)
  thirteenDaysAgo.setDate(today.getDate() - 13)
  thirteenDaysAgo.setHours(0, 0, 0, 0)

  const earningsTrendMap = new Map<string, { date: string; earnings: number; sortKey: number }>()

  for (let index = 0; index < 14; index += 1) {
    const currentDate = new Date(thirteenDaysAgo)
    currentDate.setDate(thirteenDaysAgo.getDate() + index)

    const key = currentDate.toISOString().split("T")[0]
    earningsTrendMap.set(key, {
      date: currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      earnings: 0,
      sortKey: currentDate.getTime(),
    })
  }

  completedBookings.forEach((booking) => {
    const bookingDate = new Date(booking.createdAt)
    bookingDate.setHours(0, 0, 0, 0)

    if (bookingDate < thirteenDaysAgo) {
      return
    }

    const key = bookingDate.toISOString().split("T")[0]
    const existing = earningsTrendMap.get(key)

    if (!existing) {
      return
    }

    existing.earnings += getBookingEarnings(booking)
  })

  const earningsTrend = Array.from(earningsTrendMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ date, earnings }) => ({
      date,
      earnings: Math.round(earnings * 100) / 100,
    }))

  // Calculate KPI trends for the last 14 days
  const kpiTrends: ChefDashboardData["kpiTrends"] = []
  const kpiSummary: ChefDashboardData["kpiSummary"] = {
    totalQuotesSent: proposals.length,
    totalProposalsAccepted: proposals.filter((p) => p.status === "ACCEPTED").length,
    totalProposalsRejected: proposals.filter((p) => p.status === "REJECTED").length,
    totalEarnings,
    quotesTrend: 0, // Will be calculated below
    acceptanceRate: proposals.length > 0
      ? Math.round((proposals.filter((p) => p.status === "ACCEPTED").length / proposals.length) * 100 * 10) / 10
      : 0,
  }

  // Generate KPI trends by day
  for (let index = 0; index < 14; index += 1) {
    const currentDate = new Date(thirteenDaysAgo)
    currentDate.setDate(thirteenDaysAgo.getDate() + index)
    currentDate.setHours(0, 0, 0, 0)

    const dayEnd = new Date(currentDate)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dayProposals = proposals.filter(
      (p) => p.createdAt >= currentDate && p.createdAt < dayEnd
    )
    const dayBookings = completedBookings.filter(
      (b) => b.createdAt >= currentDate && b.createdAt < dayEnd
    )

    kpiTrends.push({
      date: currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      quotesSent: dayProposals.length,
      proposalsAccepted: dayProposals.filter((p) => p.status === "ACCEPTED").length,
      proposalsRejected: dayProposals.filter((p) => p.status === "REJECTED").length,
      earnings: Math.round(
        dayBookings.reduce((sum, b) => sum + getBookingEarnings(b), 0) * 100
      ) / 100,
    })
  }

  // Calculate quotes trend (compare last 7 days to previous 7 days)
  const last7DaysQuotes = kpiTrends.slice(-7).reduce((sum, d) => sum + d.quotesSent, 0)
  const previous7DaysQuotes = kpiTrends.slice(0, 7).reduce((sum, d) => sum + d.quotesSent, 0)
  kpiSummary.quotesTrend = previous7DaysQuotes > 0
    ? Math.round(((last7DaysQuotes - previous7DaysQuotes) / previous7DaysQuotes) * 100)
    : last7DaysQuotes > 0 ? 100 : 0

  const pendingTasks: ChefDashboardData["pendingTasks"] = []

  if (profileCompletion < 100) {
    pendingTasks.push({
      id: "complete-profile",
      title: "Complete your profile",
      description: `${profileCompletion}% complete. Add missing profile details to attract more bookings.`,
      href: "/dashboard/chef/profile",
      priority: "high",
    })
  }

  if (experiences.length === 0) {
    pendingTasks.push({
      id: "create-experience",
      title: "Add your first experience",
      description: "Create a bookable experience so clients can discover and book you faster.",
      href: "/dashboard/chef/experiences",
      priority: "high",
    })
  }

  if (availabilityCount === 0) {
    pendingTasks.push({
      id: "set-availability",
      title: "Set your availability",
      description: "Open bookable time slots so instant bookings and scheduling can work correctly.",
      href: "/dashboard/chef/availability",
      priority: "medium",
    })
  }

  if (availableRequests.length > 0) {
    pendingTasks.push({
      id: "respond-requests",
      title: "Respond to open requests",
      description: `${availableRequests.length} nearby requests are available to review and convert into proposals.`,
      href: "/dashboard/chef/requests",
      priority: "medium",
    })
  }

  return {
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    activeBookings,
    availableRequests: availableRequests.length,
    completedBookings: completedBookings.length,
    averageRating: Math.round(averageRating * 10) / 10,
    quotesSentToday,
    quotesTarget,
    menusCount,
    menusTarget,
    responseRate: Math.round(responseRate * 10) / 10,
    responseRateWindowDays,
    responseRateSevenDay: Math.round(responseRateSevenDay * 10) / 10,
    responseRateThirtyDay: Math.round(responseRateThirtyDay * 10) / 10,
    avgResponseTimeMinutes,
    messageResponseRate,
    proposalResponseRate,
    requestsReceivedWeek,
    proposalsSentWeek,
    messageMetrics,
    profile: chefProfile,
    profileCompletion,
    approvalStatus: chefProfile.isApproved ? "Approved" : "Pending",
    requests: availableRequests,
    proposals,
    bookings: bookings.map((booking) => ({
      id: booking.id,
      createdAt: booking.createdAt.toISOString(),
      eventDate: booking.eventDate.toISOString(),
      status: booking.status,
      totalPrice: booking.totalPrice,
      bookingType: booking.bookingType,
      location: booking.location,
      guestCount: booking.guestCount,
      client: booking.client,
      proposal: booking.proposal
        ? {
            ...booking.proposal,
            request: booking.proposal.request
              ? {
                  ...booking.proposal.request,
                  eventDate: booking.proposal.request.eventDate.toISOString(),
                }
              : null,
          }
        : null,
      experience: booking.experience,
      payments: booking.payments
        ? {
            ...booking.payments,
            releasedAt: booking.payments.releasedAt?.toISOString() ?? null,
          }
        : null,
    })),
    experiences,
    reviews: reviews.map((review) => ({
      ...review,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    })),
    earningsData,
    earningsTrend,
    kpiTrends,
    kpiSummary,
    pendingTasks,
  }
}
