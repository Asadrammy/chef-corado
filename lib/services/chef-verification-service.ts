import { prisma } from "@/lib/prisma"

export const chefVerificationService = {
  async getVerificationStatus(chefId: string) {
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: chefId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            verified: true,
          },
        },
      },
    })

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    const identityVerified = chefProfile.verified || false
    const backgroundChecked = chefProfile.isApproved || false
    const documentsUploaded = false
    const referencesChecked = chefProfile.isApproved || false
    const lastVerified = chefProfile.updatedAt

    let verificationLevel: "FULL" | "BASIC" | "PENDING" = "PENDING"
    if (identityVerified && backgroundChecked) {
      verificationLevel = "FULL"
    } else if (backgroundChecked) {
      verificationLevel = "BASIC"
    }

    return {
      identityVerified,
      backgroundChecked,
      documentsUploaded,
      referencesChecked,
      lastVerified,
      verificationLevel,
    }
  },
}
