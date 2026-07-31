import { prisma } from "@/lib/prisma"
import { ProposalStatus } from "@/types"

const MAX_PROPOSALS_PER_REQUEST = 10

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
        } as any,
      })
    }, {
      isolationLevel: "Serializable",
    })
  },

  listProposalsForChef(chefId: string) {
    return prisma.proposal.findMany({
      where: { chefId },
      orderBy: { createdAt: "desc" },
      include: {
        menu: true,
        request: true,
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
  },

  listProposalsForClient(userId: string) {
    return prisma.proposal.findMany({
      where: { request: { clientId: userId } },
      orderBy: { createdAt: "desc" },
      include: {
        menu: true,
        request: true,
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
          },
        },
        chef: true,
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
      include: { chef: { include: { user: true } }, request: true },
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
