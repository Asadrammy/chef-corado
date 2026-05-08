import { prisma } from "@/lib/prisma"

const MAX_PROPOSALS_PER_REQUEST = 10

export const messageRepository = {
  findUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    })
  },

  createMessage(senderId: string, receiverId: string, content: string, proposalId?: string | null) {
    return prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        proposalId: proposalId ?? null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  },

  listConversations(userId: string) {
    return prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  },

  listConversationMessages(userId: string, otherUserId: string) {
    return prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            receiverId: otherUserId,
          },
          {
            senderId: otherUserId,
            receiverId: userId,
          },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })
  },

  findProposalsByIds(proposalIds: string[]) {
    return prisma.proposal.findMany({
      where: {
        id: {
          in: proposalIds,
        },
      },
      include: {
        request: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            location: true,
            budget: true,
            details: true,
            currency: true,
          },
        },
      },
    })
  },

  markConversationAsRead(userId: string, otherUserId: string) {
    return prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    })
  },

  findConversationContext(userId: string, otherUserId: string) {
    return Promise.all([
      prisma.proposal.findFirst({
        where: {
          OR: [
            {
              chef: {
                userId,
              },
              request: {
                clientId: otherUserId,
              },
            },
            {
              chef: {
                userId: otherUserId,
              },
              request: {
                clientId: userId,
              },
            },
          ],
        },
        include: {
          request: {
            select: {
              id: true,
              title: true,
              eventDate: true,
              location: true,
              budget: true,
              details: true,
              currency: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.booking.findFirst({
        where: {
          OR: [
            {
              chef: {
                userId,
              },
              clientId: otherUserId,
            },
            {
              chef: {
                userId: otherUserId,
              },
              clientId: userId,
            },
          ],
        },
        include: {
          proposal: {
            include: {
              request: {
                select: {
                  id: true,
                  title: true,
                  eventDate: true,
                  location: true,
                  budget: true,
                  details: true,
                  currency: true,
                },
              },
            },
          },
        },
        orderBy: {
          eventDate: "desc",
        },
      }),
    ])
  },

  findChefProfileByUserId(userId: string) {
    return prisma.chefProfile.findUnique({
      where: { userId },
    })
  },

  findRequestForChefClientConversation(requestId: string, chefUserId: string, clientUserId: string) {
    return prisma.request.findFirst({
      where: {
        id: requestId,
        clientId: clientUserId,
        OR: [
          {
            proposals: {
              some: {
                chef: {
                  userId: chefUserId,
                },
              },
            },
          },
          {
            clientId: clientUserId,
          },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        proposals: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    })
  },

  createProposalForConversation(input: {
    requestId: string
    chefId: string
    price: number
    currency: string
    message: string
    expiresAt: Date
  }) {
    return prisma.proposal.create({
      data: {
        requestId: input.requestId,
        chefId: input.chefId,
        price: input.price,
        currency: input.currency,
        message: input.message,
        expiresAt: input.expiresAt,
      },
      include: {
        request: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            location: true,
            budget: true,
            details: true,
            currency: true,
          },
        },
      },
    })
  },

  createProposalForConversationAtomically(input: {
    requestId: string
    chefId: string
    price: number
    currency: string
    message: string
    expiresAt: Date
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
          requestId: input.requestId,
          chefId: input.chefId,
          price: input.price,
          currency: input.currency,
          message: input.message,
          expiresAt: input.expiresAt,
        },
        include: {
          request: {
            select: {
              id: true,
              title: true,
              eventDate: true,
              location: true,
              budget: true,
              details: true,
              currency: true,
            },
          },
        },
      })
    }, {
      isolationLevel: "Serializable",
    })
  },

  updateConversationProposal(proposalId: string, chefId: string, data: { price: number; message: string; expiresAt: Date }) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.proposal.updateMany({
        where: { id: proposalId, chefId },
        data: {
          price: data.price,
          message: data.message,
          expiresAt: data.expiresAt,
          status: "PENDING",
        },
      })

      if (result.count === 0) {
        throw new Error("PROPOSAL_NOT_FOUND")
      }

      return tx.proposal.findUniqueOrThrow({
        where: { id: proposalId },
        include: {
          request: {
            select: {
              id: true,
              title: true,
              eventDate: true,
              location: true,
              budget: true,
              details: true,
              currency: true,
            },
          },
        },
      })
    })
  },

  findProposalOwnedByChef(proposalId: string, chefUserId: string) {
    return prisma.proposal.findFirst({
      where: {
        id: proposalId,
        chef: {
          userId: chefUserId,
        },
      },
      include: {
        request: {
          select: {
            id: true,
            clientId: true,
            title: true,
            eventDate: true,
            location: true,
            budget: true,
            details: true,
            currency: true,
          },
        },
      },
    })
  },
}
