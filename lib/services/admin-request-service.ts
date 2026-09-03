import { prisma } from "@/lib/prisma"
import { requestRepository } from "@/lib/repositories/request-repository"
import { filterEligibleChefsForRequest } from "@/lib/chef-request-matching"
import { notifyEligibleChefsAboutRequest } from "@/lib/services/request-notification-service"
import { withRequestPhotoFallback } from "@/lib/request-photo-schema"
import { evaluateChefRequestAccessForRecords } from "@/lib/services/request-eligibility-service"

export const adminRequestService = {
  async notifyChefsAboutRequest(requestId: string) {
    const requestData = await withRequestPhotoFallback(
      () => prisma.request.findUnique({
        where: { id: requestId },
        include: {
          client: {
            select: {
              name: true,
              firstName: true,
            },
          },
          proposals: { select: { chefId: true, status: true } },
          invitations: { select: { chefId: true, status: true, createdAt: true } },
          _count: { select: { proposals: true } },
          photos: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            take: 3,
            select: {
              id: true,
              url: true,
              originalName: true,
            },
          },
          multiDayDates: { orderBy: { sortOrder: "asc" } },
        },
      }),
      () => prisma.request.findUnique({
        where: { id: requestId },
        include: {
          client: {
            select: {
              name: true,
              firstName: true,
            },
          },
          proposals: { select: { chefId: true, status: true } },
          invitations: { select: { chefId: true, status: true, createdAt: true } },
          _count: { select: { proposals: true } },
          multiDayDates: { orderBy: { sortOrder: "asc" } },
        },
      })
    )

    if (!requestData) {
      throw new Error("REQUEST_NOT_FOUND")
    }

    const activeChefs = await requestRepository.findApprovedChefsWithCoordinates()
    const localChefs = await filterEligibleChefsForRequest(
      {
        ...requestData,
        requestMode: requestData.requestMode,
        eventDate: requestData.eventDate,
        eventDates: requestData.eventDates ? JSON.parse(requestData.eventDates) : undefined,
        multiDayDates: requestData.multiDayDates.map((date) => ({
          date: date.date,
          serviceType: date.serviceType,
          cuisineTypes: date.cuisineTypes,
          dietaryRequirements: date.dietaryRequirements,
        })),
        latitude: requestData.latitude,
        longitude: requestData.longitude,
        pricingGuestCount: requestData.pricingGuestCount,
        billableGuestCount: requestData.billableGuestCount,
        actualAttendeeCount: requestData.actualAttendeeCount,
        guestCount: requestData.guestCount,
      } as any,
      activeChefs
    )
    const matchingChefs = []
    for (const chef of localChefs) {
      const access = await evaluateChefRequestAccessForRecords({ chef, request: requestData })
      if (access.canView) {
        matchingChefs.push(chef)
      }
    }

    const notificationResults = await notifyEligibleChefsAboutRequest({
      request: requestData,
      chefs: matchingChefs,
    })

    return {
      message: `Notified ${notificationResults.chefsNotified} matching chefs`,
      chefsNotified: notificationResults.chefsNotified,
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
