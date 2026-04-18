import { prisma } from "@/lib/prisma"

export const adminChefService = {
  async approveChef(chefId: string) {
    return prisma.chefProfile.update({
      where: { id: chefId },
      data: { isApproved: true },
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

  async rejectChef(chefId: string) {
    const chef = await prisma.chefProfile.findUnique({
      where: { id: chefId },
    })

    if (!chef) {
      throw new Error("CHEF_NOT_FOUND")
    }

    await prisma.chefProfile.delete({
      where: { id: chefId },
    })

    return {
      message: "Chef rejected and profile removed successfully",
    }
  },
}
