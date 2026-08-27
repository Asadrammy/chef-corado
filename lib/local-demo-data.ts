import { BookingStatus, PaymentStatus, Role } from "@/types"

function daysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

function dateKey(date: Date) {
  return date.toISOString().split("T")[0]
}

export const localDemoChefs = [
  {
    id: "local-demo-chef-profile",
    userId: "cmph911b10001byd5xgn4e5o1",
    isApproved: true,
    verificationStatus: "APPROVED",
    createdAt: daysFromNow(-40).toISOString(),
    user: {
      id: "cmph911b10001byd5xgn4e5o1",
      name: "John Anderson",
      email: "chef@example.com",
      isBanned: false,
      banReason: null,
      banAdminNotes: null,
      bannedAt: null,
      termsAcceptedAt: daysFromNow(-40).toISOString(),
      termsVersion: "2026-04",
    },
    _count: {
      experiences: 3,
      bookings: 3,
    },
  },
  {
    id: "local-demo-chef-profile-2",
    userId: "local-demo-chef-2",
    isApproved: false,
    verificationStatus: "PENDING",
    createdAt: daysFromNow(-8).toISOString(),
    user: {
      id: "local-demo-chef-2",
      name: "Priya Shah",
      email: "priya.chef@example.com",
      isBanned: false,
      banReason: null,
      banAdminNotes: null,
      bannedAt: null,
      termsAcceptedAt: daysFromNow(-8).toISOString(),
      termsVersion: "2026-04",
    },
    _count: {
      experiences: 1,
      bookings: 0,
    },
  },
]

export const localDemoBookings = [
  {
    id: "local-booking-confirmed",
    totalPrice: 1850,
    currency: "GBP",
    status: BookingStatus.CONFIRMED,
    bookingType: "CUSTOM_REQUEST",
    eventDate: daysFromNow(8).toISOString(),
    location: "Downtown",
    createdAt: daysFromNow(-2).toISOString(),
    client: {
      id: "local-client-maya",
      name: "Maya R.",
      email: "maya@example.com",
    },
    chef: {
      id: "local-demo-chef-profile",
      name: "John Anderson",
      profileImage: null,
      user: {
        name: "John Anderson",
        email: "chef@example.com",
      },
    },
    proposal: {
      menu: {
        title: "Seasonal tasting menu",
        price: 1850,
      },
      request: {
        eventDate: daysFromNow(8).toISOString(),
        details: "Anniversary dinner with a seasonal tasting menu and celebratory dessert.",
        location: "Downtown",
      },
    },
    payments: [],
  },
  {
    id: "local-booking-pending",
    totalPrice: 2400,
    currency: "GBP",
    status: BookingStatus.PENDING,
    bookingType: "CUSTOM_REQUEST",
    eventDate: daysFromNow(15).toISOString(),
    location: "West End",
    createdAt: daysFromNow(-1).toISOString(),
    client: {
      id: "local-client-daniel",
      name: "Daniel K.",
      email: "daniel@example.com",
    },
    chef: {
      id: "local-demo-chef-profile",
      name: "John Anderson",
      profileImage: null,
      user: {
        name: "John Anderson",
        email: "chef@example.com",
      },
    },
    proposal: {
      menu: {
        title: "Modern Italian celebration",
        price: 2400,
      },
      request: {
        eventDate: daysFromNow(15).toISOString(),
        details: "Modern Italian tasting menu for a private celebration.",
        location: "West End",
      },
    },
    payments: [],
  },
  {
    id: "local-booking-completed",
    totalPrice: 1320,
    currency: "GBP",
    status: BookingStatus.COMPLETED,
    bookingType: "INSTANT",
    eventDate: daysFromNow(-10).toISOString(),
    location: "Riverside",
    createdAt: daysFromNow(-18).toISOString(),
    client: {
      id: "local-client-avery",
      name: "Avery P.",
      email: "avery@example.com",
    },
    chef: {
      id: "local-demo-chef-profile",
      name: "John Anderson",
      profileImage: null,
      user: {
        name: "John Anderson",
        email: "chef@example.com",
      },
    },
    proposal: {
      menu: {
        title: "Family brunch",
        price: 1320,
      },
      request: {
        eventDate: daysFromNow(-10).toISOString(),
        details: "Family brunch with pastries, plated mains, and coffee service.",
        location: "Riverside",
      },
    },
    payments: [],
  },
]

type LocalDemoPayment = {
  id: string
  status: PaymentStatus
  amount: number
  chefAmount: number
  commissionAmount: number
  currency: string
  createdAt: string
  booking: (typeof localDemoBookings)[number]
}

export const localDemoPayments: LocalDemoPayment[] = [
  {
    id: "local-payment-completed",
    status: PaymentStatus.COMPLETED,
    amount: 1320,
    chefAmount: 1122,
    commissionAmount: 198,
    currency: "GBP",
    createdAt: daysFromNow(-10).toISOString(),
    booking: localDemoBookings[2],
  },
  {
    id: "local-payment-pending",
    status: PaymentStatus.PENDING,
    amount: 1850,
    chefAmount: 1572.5,
    commissionAmount: 277.5,
    currency: "GBP",
    createdAt: daysFromNow(-2).toISOString(),
    booking: localDemoBookings[0],
  },
]

export const localDemoClientRequests = [
  {
    id: "local-request-anniversary",
    title: "Anniversary tasting dinner",
    eventType: "Anniversary",
    serviceType: "FOUR_FIVE_COURSE_MEAL",
    serviceTypeLabel: "4-5-Course Meal",
    cuisineTypes: JSON.stringify(["Mediterranean", "Modern European"]),
    dietaryRequirements: JSON.stringify(["Vegetarian options"]),
    description: "A warm, restaurant-style dinner at home.",
    details: "Four-course anniversary dinner with a celebratory dessert and wine-friendly pacing.",
    eventDate: daysFromNow(14),
    createdAt: daysFromNow(-2),
    eventTime: "19:00",
    location: "Downtown",
    countryCode: "GB",
    budget: 1850,
    currency: "GBP",
    guestCount: 8,
    status: "OPEN",
    _count: {
      proposals: 2,
    },
    proposals: [
      {
        id: "local-proposal-anderson",
        price: 1850,
        currency: "GBP",
        status: "PENDING",
        createdAt: daysFromNow(-1),
        chef: {
          user: {
            name: "John Anderson",
            email: "chef@example.com",
          },
        },
      },
    ],
  },
  {
    id: "local-request-cooking-class",
    title: "Team pasta workshop",
    eventType: "Work Event",
    serviceType: "COOKING_CLASS",
    serviceTypeLabel: "Cooking Class",
    cuisineTypes: JSON.stringify(["Italian"]),
    dietaryRequirements: JSON.stringify(["No shellfish"]),
    description: "Hands-on team activity with dinner afterwards.",
    details: "Fresh pasta class for a small team, with a simple dessert and non-alcoholic drinks.",
    eventDate: daysFromNow(25),
    createdAt: daysFromNow(-1),
    eventTime: "18:30",
    location: "West End",
    countryCode: "GB",
    budget: 2400,
    currency: "GBP",
    guestCount: 12,
    status: "OPEN",
    _count: {
      proposals: 0,
    },
    proposals: [],
  },
]

export function localDemoClientRequestDetail(requestId: string) {
  return localDemoClientRequests.find((request) => request.id === requestId) ?? null
}

export function localDemoAdminAnalytics() {
  return {
    totalUsers: 8,
    totalChefs: localDemoChefs.filter((chef) => chef.isApproved).length,
    totalClients: 4,
    totalBookings: localDemoBookings.length,
    totalRevenue: localDemoPayments
      .filter((payment) => payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.RELEASED)
      .reduce((sum, payment) => sum + payment.commissionAmount, 0),
    activeBookings: localDemoBookings.filter((booking) => booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED).length,
    pendingProposals: 2,
    platformStats: localDemoBookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1
      return acc
    }, {}),
    trends: {
      usersChange: 12,
      revenueChange: 15,
    },
    localDemo: true,
  }
}

export function localDemoAdminDashboardStats() {
  const adminAnalytics = localDemoAdminAnalytics()

  return {
    totalChefs: localDemoChefs.filter((chef) => !chef.user.isBanned).length,
    pendingChefs: localDemoChefs.filter((chef) => !chef.isApproved && !chef.user.isBanned).length,
    totalBookings: adminAnalytics.totalBookings,
    activeBookings: adminAnalytics.activeBookings,
    totalRevenue: adminAnalytics.totalRevenue,
    pendingPayouts: localDemoPayments.filter((payment) => payment.status === PaymentStatus.PENDING).length,
  }
}

export function localDemoClientAnalytics() {
  const clientBookings = localDemoBookings
  const completedBookings = clientBookings.filter((booking) => booking.status === BookingStatus.COMPLETED)
  const totalSpending = clientBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)

  return {
    totalBookings: clientBookings.length,
    totalSpending,
    bookingsByStatus: clientBookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1
      return acc
    }, {}),
    spendingTrends: completedBookings.map((booking) => ({
      date: dateKey(new Date(booking.createdAt)),
      amount: booking.totalPrice,
    })),
    trends: {
      bookingsChange: 10,
      spendingChange: 8,
    },
    localDemo: true,
  }
}

export function localDemoChefAnalytics() {
  const completedBookings = localDemoBookings.filter((booking) => booking.status === BookingStatus.COMPLETED)
  const releasedPayments = localDemoPayments.filter(
    (payment) => payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.RELEASED
  )

  return {
    totalBookings: localDemoBookings.length,
    completedBookings: completedBookings.length,
    totalEarnings: releasedPayments.reduce((sum, payment) => sum + payment.chefAmount, 0),
    averageRating: 4.8,
    totalReviews: 3,
    proposalsSent: 4,
    bookingsByStatus: localDemoBookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1
      return acc
    }, {}),
    earningsTrends: releasedPayments.map((payment) => ({
      date: dateKey(new Date(payment.createdAt)),
      amount: payment.chefAmount,
    })),
    trends: {
      earningsChange: 12,
      bookingsChange: 6,
    },
    localDemo: true,
  }
}

export function localDemoOnboardingProgress(role?: string) {
  if (role === Role.CHEF) {
    return {
      profileCompletion: 85,
      isApproved: true,
      isVerified: true,
      hasCreatedMenu: true,
      hasSetAvailability: true,
      hasSentProposal: true,
      hasCompletedBooking: true,
      hasReceivedPayment: true,
      hasReceivedReview: true,
      localDemo: true,
    }
  }

  return {
    profileCompletion: 80,
    hasCreatedRequest: true,
    hasBrowsedExperiences: true,
    hasMadeBooking: localDemoBookings.length > 0,
    hasCompletedPayment: localDemoPayments.some(
      (payment) => payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.RELEASED
    ),
    hasLeftReview: false,
    localDemo: true,
  }
}

export function localDemoTimeSeries(days: number, type: "revenue" | "bookings" | "users") {
  const safeDays = Number.isFinite(days) && days > 0 ? days : 30
  const start = daysFromNow(-safeDays)
  const data = Array.from({ length: safeDays + 1 }, (_, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    const date = dateKey(current)

    if (type === "revenue") {
      return { date, revenue: index % 9 === 0 ? 198 + index * 3 : 0 }
    }

    if (type === "bookings") {
      return { date, count: index % 7 === 0 ? 1 : 0 }
    }

    return { date, newUsers: index % 6 === 0 ? 1 : 0 }
  })

  if (type === "revenue") {
    const totalRevenue = data.reduce((sum, item: any) => sum + item.revenue, 0)
    return {
      data,
      summary: {
        totalRevenue,
        averageDailyRevenue: Math.round((totalRevenue / safeDays) * 100) / 100,
        daysWithRevenue: data.filter((item: any) => item.revenue > 0).length,
        totalPayments: localDemoPayments.length,
        localDemo: true,
      },
    }
  }

  if (type === "bookings") {
    const totalBookings = data.reduce((sum, item: any) => sum + item.count, 0)
    return {
      data,
      summary: {
        totalBookings,
        averageDailyBookings: Math.round((totalBookings / safeDays) * 100) / 100,
        daysWithBookings: data.filter((item: any) => item.count > 0).length,
        totalBookingValue: localDemoBookings.reduce((sum, booking) => sum + booking.totalPrice, 0),
        statusBreakdown: localDemoAdminAnalytics().platformStats,
        typeBreakdown: { CUSTOM_REQUEST: 2, INSTANT: 1 },
        localDemo: true,
      },
    }
  }

  const totalNewUsers = data.reduce((sum, item: any) => sum + item.newUsers, 0)
  return {
    data,
    summary: {
      totalNewUsers,
      averageDailyUsers: Math.round((totalNewUsers / safeDays) * 100) / 100,
      daysWithNewUsers: data.filter((item: any) => item.newUsers > 0).length,
      roleBreakdown: { [Role.ADMIN]: 1, [Role.CHEF]: 3, [Role.CLIENT]: 4 },
      totalPlatformUsers: 8,
      localDemo: true,
    },
  }
}
