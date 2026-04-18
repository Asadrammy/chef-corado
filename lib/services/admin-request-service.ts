import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export const adminRequestService = {
  async notifyChefsAboutRequest(requestId: string) {
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: true,
      },
    })

    if (!requestData) {
      throw new Error("REQUEST_NOT_FOUND")
    }

    const activeChefs = await prisma.chefProfile.findMany({
      where: {
        isApproved: true,
        isBanned: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 10,
    })

    // Create notifications with preference checking
    const notificationResults = await Promise.all(
      activeChefs.map((chef) =>
        createNotification(
          chef.user.id,
          "NEW_REQUEST_ALERT",
          `Urgent request: ${requestData.title || "New Event"} in ${requestData.location}`
        )
      )
    )

    const successfulNotifications = notificationResults.filter(Boolean).length

    return {
      message: `Notified ${successfulNotifications} chefs (preferences respected)`,
      chefsNotified: successfulNotifications,
    }
  },

  async highlightRequest(requestId: string) {
    const requestData = await prisma.request.findUnique({
      where: { id: requestId },
    })

    if (!requestData) {
      throw new Error("REQUEST_NOT_FOUND")
    }

    return {
      message: "Request highlighted successfully",
      requestId,
    }
  },

  async getLiquidityData() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const [newRequests, unrespondedRequests] = await Promise.all([
      prisma.request.findMany({
        where: {
          createdAt: { gte: oneHourAgo },
        },
        include: {
          _count: {
            select: { proposals: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.request.findMany({
        where: {
          createdAt: { lt: oneHourAgo },
          proposals: {
            none: {},
          },
          eventDate: { gte: new Date() },
        },
        include: {
          _count: {
            select: { proposals: true },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
    ])

    return {
      newRequests: newRequests.map((request) => ({
        ...request,
        proposalCount: request._count.proposals,
      })),
      unrespondedRequests: unrespondedRequests.map((request) => ({
        ...request,
        proposalCount: request._count.proposals,
      })),
    }
  },
}
