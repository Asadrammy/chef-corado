import { prisma } from "@/lib/prisma"

export const requestInvitationRepository = {
  findChefProfileByUserId(userId: string) {
    return prisma.chefProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    })
  },

  listInvitationsForChef(chefId: string) {
    return prisma.requestInvitation.findMany({
      where: { chefId },
      include: {
        request: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  },

  findInvitationByIdForChef(invitationId: string, chefId: string) {
    return prisma.requestInvitation.findFirst({
      where: {
        id: invitationId,
        chefId,
      },
      include: {
        request: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        chef: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })
  },

  updateInvitationStatus(invitationId: string, status: string) {
    return prisma.requestInvitation.update({
      where: { id: invitationId },
      data: { status },
      include: {
        request: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        chef: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })
  },
}
