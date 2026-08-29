import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withRequestPhotoFallback } from "@/lib/request-photo-schema"
import { ProposalStatus } from "@/types"

const MAX_PROPOSALS_PER_REQUEST = 10

function buildChefProposalRequestSelect(includePhotos: boolean) {
  const baseSelect = {
    client: {
      select: {
        id: true,
        name: true,
        firstName: true,
      },
    },
    _count: {
      select: {
        proposals: true,
      },
    },
    ...(includePhotos ? {
      photos: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 3,
        select: {
          id: true,
          url: true,
          originalName: true,
        },
      },
    } : {}),
    multiDayDates: { orderBy: { sortOrder: "asc" as const } },
    title: true,
    eventType: true,
    requestMode: true,
    serviceType: true,
    serviceTypeLabel: true,
    serviceTier: true,
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
  } satisfies Prisma.RequestSelect

  return baseSelect
}

function buildChefProposalInclude(includePhotos: boolean) {
  return {
    menu: true,
    lineItems: { orderBy: { sortOrder: "asc" as const } },
    request: {
      select: buildChefProposalRequestSelect(includePhotos),
    },
    chef: {
      include: {
        user: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    },
  } satisfies Prisma.ProposalInclude
}

export const proposalRepository = {
  findChefProfileByUserId(userId: string) {
    return prisma.chefProfile.findUnique({
      where: { userId },
    })
  },

  findRequestWithClient(requestId: string) {
    return prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        multiDayDates: { orderBy: { date: "asc" } },
      },
    })
  },

  countProposalsForRequest(requestId: string) {
    return prisma.proposal.count({
      where: { requestId },
    })
  },

  findOwnedMenu(menuId: string, chefId: string) {
    return prisma.menu.findFirst({
      where: {
        id: menuId,
        chefId,
      },
      select: {
        id: true,
      },
    })
  },

  createProposal(input: {
    requestId: string
    chefId: string
    price: number
    currency: string
    message: string
    menuId?: string | null
    expiresAt?: Date
    lineItems?: Array<{
      serviceDate?: Date | null
      title: string
      description?: string | null
      price: number
      currency: string
      sortOrder: number
    }>
  }) {
    return prisma.proposal.create({
      data: {
        request: { connect: { id: input.requestId } },
        chef: { connect: { id: input.chefId } },
        price: input.price,
        currency: input.currency,
        message: input.message,
        menuId: input.menuId ?? null,
        expiresAt: input.expiresAt,
        status: ProposalStatus.PENDING,
        lineItems: input.lineItems?.length ? {
          create: input.lineItems.map((item) => ({
            serviceDate: item.serviceDate ?? null,
            title: item.title,
            description: item.description ?? null,
            price: item.price,
            currency: item.currency,
            sortOrder: item.sortOrder,
          })),
        } : undefined,
      } as any,
    })
  },

  createProposalAtomically(input: {
    requestId: string
    chefId: string
    price: number
    currency: string
    message: string
    menuId?: string | null
    expiresAt?: Date
    lineItems?: Array<{
      serviceDate?: Date | null
      title: string
      description?: string | null
      price: number
      currency: string
      sortOrder: number
    }>
  }) {
    return prisma.$transaction(async (tx) => {
      const existingProposalCount = await tx.proposal.count({
        where: { requestId: input.requestId },
      })

      if (existingProposalCount >= MAX_PROPOSALS_PER_REQUEST) {
        throw new Error("REQUEST_PROPOSAL_LIMIT_REACHED")
      }

      return tx.proposal.create({
        data: {
          request: { connect: { id: input.requestId } },
          chef: { connect: { id: input.chefId } },
          price: input.price,
          currency: input.currency,
          message: input.message,
          menuId: input.menuId ?? null,
          expiresAt: input.expiresAt,
          status: ProposalStatus.PENDING,
          lineItems: input.lineItems?.length ? {
            create: input.lineItems.map((item) => ({
              serviceDate: item.serviceDate ?? null,
              title: item.title,
              description: item.description ?? null,
              price: item.price,
              currency: item.currency,
              sortOrder: item.sortOrder,
            })),
          } : undefined,
        } as any,
      })
    }, {
      isolationLevel: "Serializable",
    })
  },

  listProposalsForChef(chefId: string) {
    return withRequestPhotoFallback(
      () => prisma.proposal.findMany({
        where: { chefId },
        orderBy: { createdAt: "desc" },
        include: buildChefProposalInclude(true),
      }),
      () => prisma.proposal.findMany({
        where: { chefId },
        orderBy: { createdAt: "desc" },
        include: buildChefProposalInclude(false),
      })
    )
  },

  listProposalsForChefLegacy(chefId: string) {
    return withRequestPhotoFallback(
      () => prisma.proposal.findMany({
        where: { chefId },
        orderBy: { createdAt: "desc" },
        include: {
          menu: true,
          request: {
            select: buildChefProposalRequestSelect(true),
          },
          chef: {
            include: {
              user: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
      }),
      () => prisma.proposal.findMany({
        where: { chefId },
        orderBy: { createdAt: "desc" },
        include: {
          menu: true,
          request: {
            select: buildChefProposalRequestSelect(false),
          },
          chef: {
            include: {
              user: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
      })
    )
  },

  listProposalsForClient(userId: string) {
    return prisma.proposal.findMany({
      where: { request: { clientId: userId } },
      orderBy: { createdAt: "desc" },
      include: {
        menu: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
        request: {
          include: {
            multiDayDates: { orderBy: { sortOrder: "asc" } },
          },
        },
        chef: {
          include: {
            user: {
              select: {
                name: true,
                id: true,
              },
            },
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    })
  },

  listProposalsForClientLegacy(userId: string) {
    return prisma.proposal.findMany({
      where: { request: { clientId: userId } },
      orderBy: { createdAt: "desc" },
      include: {
        menu: true,
        request: {
          include: {
            multiDayDates: { orderBy: { sortOrder: "asc" } },
          },
        },
        chef: {
          include: {
            user: {
              select: {
                name: true,
                id: true,
              },
            },
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    })
  },

  findProposalForResolution(proposalId: string) {
    return prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        request: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            multiDayDates: { orderBy: { sortOrder: "asc" } },
          },
        },
        chef: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    })
  },

  acceptProposal(proposalId: string, requestId: string) {
    return prisma.$transaction(async (tx) => {
      const accepted = await tx.proposal.update({
        where: { id: proposalId },
        data: { status: ProposalStatus.ACCEPTED },
        include: { chef: true, request: true },
      })

      await tx.proposal.updateMany({
        where: {
          requestId,
          id: { not: proposalId },
          status: ProposalStatus.PENDING,
        },
        data: { status: ProposalStatus.REJECTED },
      })

      return accepted
    })
  },

  rejectProposal(proposalId: string) {
    return prisma.proposal.update({
      where: { id: proposalId },
      data: { status: ProposalStatus.REJECTED },
      include: {
        chef: { include: { user: true } },
        request: { include: { multiDayDates: { orderBy: { sortOrder: "asc" } } } },
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    })
  },

  updateProposalStatus(proposalId: string, status: string) {
    return prisma.proposal.update({
      where: { id: proposalId },
      data: { status },
      include: { chef: true, request: true },
    })
  },

  findChefUser(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
  },
}
