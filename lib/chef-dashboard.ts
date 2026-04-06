import { prisma } from "@/lib/prisma"
import { calculateDistance } from "@/lib/geo"

export type ChefDashboardRequestItem = {
  id: string
  title: string
  budget: number
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
      title: string
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

  const [requests, proposals, bookings, experiences, reviews, availabilityCount] = await Promise.all([
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
      title: request.title,
      budget: request.budget,
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
    pendingTasks,
  }
}
