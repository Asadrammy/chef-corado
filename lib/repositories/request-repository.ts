import { prisma } from "@/lib/prisma"

export const requestRepository = {
  createRequest(input: {
    clientId: string
    title: string
    eventType: string
    cuisineTypes?: string
    dietaryRequirements?: string
    description?: string
    eventDate: Date
    eventTime?: string
    location: string
    countryCode: string
    currency: string
    guestCount: number
    latitude?: number
    longitude?: number
    locationCity?: string
    locationRegion?: string
    formattedAddress?: string
    geocodingProvider?: string
    geocodingStatus?: string
    budget: number
    details?: string
  }) {
    const data = {
      clientId: input.clientId,
      title: input.title,
      eventType: input.eventType,
      cuisineTypes: input.cuisineTypes || null,
      dietaryRequirements: input.dietaryRequirements || null,
      description: input.description || null,
      eventDate: input.eventDate,
      eventTime: input.eventTime || null,
      location: input.location,
      countryCode: input.countryCode,
      currency: input.currency,
      guestCount: input.guestCount,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      locationCity: input.locationCity ?? null,
      locationRegion: input.locationRegion ?? null,
      formattedAddress: input.formattedAddress ?? null,
      geocodingProvider: input.geocodingProvider ?? null,
      geocodingStatus: input.geocodingStatus ?? "UNVERIFIED",
      budget: input.budget,
      details: input.details || null,
    } as any

    return prisma.request.create({
      data,
    })
  },

  findApprovedChefsWithCoordinates() {
    return prisma.chefProfile.findMany({
      where: {
        isApproved: true,
        isBanned: false,
        latitude: { not: null },
        longitude: { not: null },
        radius: { gt: 0 },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
  },

  findChefProfileByUserId(userId: string) {
    return prisma.chefProfile.findUnique({
      where: { userId },
    })
  },

  listRequestsForClient(userId: string) {
    return prisma.request.findMany({
      where: { clientId: userId },
      orderBy: { eventDate: "desc" },
    })
  },

  listChefMarketplaceRequests(chefId: string) {
    return prisma.request.findMany({
      where: {
        eventDate: { gte: new Date() },
        proposals: {
          none: {
            chefId,
          },
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { eventDate: "desc" },
      take: 100,
    })
  },

  listAllRequests() {
    return prisma.request.findMany({
      orderBy: { eventDate: "desc" },
    })
  },
}
