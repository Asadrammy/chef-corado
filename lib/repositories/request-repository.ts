import { prisma } from "@/lib/prisma"

export const requestRepository = {
  createRequest(input: {
    clientId: string
    title: string
    description?: string
    eventDate: Date
    location: string
    latitude?: number
    longitude?: number
    budget: number
    details?: string
  }) {
    return prisma.request.create({
      data: {
        clientId: input.clientId,
        title: input.title,
        description: input.description || null,
        eventDate: input.eventDate,
        location: input.location,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        budget: input.budget,
        details: input.details || null,
      },
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
        latitude: { not: null },
        longitude: { not: null },
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
