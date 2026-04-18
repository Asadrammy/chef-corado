import { prisma } from "@/lib/prisma"
import { ProposalStatus } from "@/types"

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

  createProposal(input: {
    requestId: string
    chefId: string
    price: number
    message: string
    expiresAt?: Date
  }) {
    return prisma.proposal.create({
      data: {
        request: { connect: { id: input.requestId } },
        chef: { connect: { id: input.chefId } },
        price: input.price,
        message: input.message,
        expiresAt: input.expiresAt,
        status: ProposalStatus.PENDING,
      },
    })
  },

  listProposalsForChef(chefId: string) {
    return prisma.proposal.findMany({
      where: { chefId },
      orderBy: { createdAt: "desc" },
      include: {
        request: true,
        chef: {
          include: {
            user: {
              select: {
                name: true,
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
        request: true,
        chef: {
          include: {
            user: {
              select: {
                name: true,
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
      include: { chef: true, request: true },
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
