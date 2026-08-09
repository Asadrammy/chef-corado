import { prisma } from "@/lib/prisma"

export const adminChefService = {
  async approveChef(chefId: string, actorId = "SYSTEM") {
    const existing = await prisma.chefProfile.findUnique({ where: { id: chefId } })
    const chef = await prisma.chefProfile.update({
      where: { id: chefId },
      data: { isApproved: true, verificationStatus: "APPROVED", approvedAt: new Date(), approvedBy: actorId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        action: "CHEF_APPROVED",
        entityType: "ChefProfile",
        entityId: chefId,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify({ isApproved: chef.isApproved, verificationStatus: chef.verificationStatus }),
        performedBy: actorId,
        reason: "Chef approved from admin workspace",
      },
    })

    return chef
  },

  async rejectChef(chefId: string, actorId = "SYSTEM") {
    const chef = await prisma.chefProfile.findUnique({
      where: { id: chefId },
    })

    if (!chef) {
      throw new Error("CHEF_NOT_FOUND")
    }

    await prisma.chefProfile.delete({
      where: { id: chefId },
    })

    await prisma.auditLog.create({
      data: {
        action: "CHEF_REJECTED",
        entityType: "ChefProfile",
        entityId: chefId,
        oldValue: JSON.stringify(chef),
        newValue: JSON.stringify({ deleted: true }),
        performedBy: actorId,
        reason: "Chef rejected and profile removed from admin workspace",
      },
    })

    return {
      message: "Chef rejected and profile removed successfully",
    }
  },
}
