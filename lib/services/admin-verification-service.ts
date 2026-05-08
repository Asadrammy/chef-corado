import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { createNotification } from "@/lib/notifications"

type VerificationAction = "APPROVE" | "REJECT"
type ReviewType = "profile" | "insurance"

type VerificationChef = Prisma.ChefProfileGetPayload<{
  include: {
    user: {
      select: {
        id: true
        name: true
        email: true
        verified: true
        profileCompletion: true
        experienceLevel: true
        createdAt: true
        role: true
      }
    }
    _count: {
      select: {
        experiences: true
        bookings: true
        reviews: true
        menus: true
      }
    }
  }
}>

function calculateProfileCompletion(chef: VerificationChef): number {
  let completion = 0
  const maxFields = 10

  if (chef.bio) completion += 1
  if (chef.experience) completion += 1
  if (chef.location) completion += 1
  if (chef.profileImage) completion += 1
  if (chef.cuisineType) completion += 1
  if (chef._count.experiences > 0) completion += 1
  if (chef._count.experiences >= 3) completion += 1
  if (chef._count.bookings > 0) completion += 1
  if (chef._count.reviews > 0) completion += 1
  if (chef.user.verified) completion += 1

  return Math.round((completion / maxFields) * 100)
}

export const adminVerificationService = {
  async listVerificationQueue(status: string | null, page: number, limit: number) {
    const where: Prisma.ChefProfileWhereInput = {}
    if (status) {
      where.verificationStatus = status
    }

    const [chefs, total] = await Promise.all([
      prisma.chefProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              verified: true,
              profileCompletion: true,
              experienceLevel: true,
              createdAt: true,
              role: true,
            },
          },
          _count: {
            select: {
              experiences: true,
              bookings: true,
              reviews: true,
              menus: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.chefProfile.count({ where }),
    ])

    return {
      chefs: chefs.map((chef) => ({
        ...chef,
        profileCompletion: calculateProfileCompletion(chef),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  },

  async updateVerificationStatus(chefId: string, action: VerificationAction, reason?: string, reviewType: ReviewType = "profile", adminUserId?: string) {
    const chef = await prisma.chefProfile.findUnique({
      where: { id: chefId },
      include: {
        user: true,
      },
    })

    if (!chef) {
      throw new Error("CHEF_NOT_FOUND")
    }

    const updatedChef = await prisma.chefProfile.update({
      where: { id: chefId },
      data: (reviewType === "insurance"
        ? {
            insuranceStatus: action === "APPROVE" ? "verified" : "rejected",
            insuranceVerifiedAt: action === "APPROVE" ? new Date() : null,
            insuranceVerifiedBy: action === "APPROVE" ? (adminUserId ?? null) : null,
          }
        : {
            verified: action === "APPROVE",
            verificationStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
          }) as never,
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

    if (reviewType === "profile") {
      await prisma.user.update({
        where: { id: chef.user.id },
        data: {
          verified: action === "APPROVE",
        },
      })
    }

    await createNotification(
      chef.user.id,
      reviewType === "insurance"
        ? action === "APPROVE" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED"
        : action === "APPROVE" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
      reviewType === "insurance"
        ? action === "APPROVE"
          ? "Your insurance document has been verified and your compliance status is now active."
          : `Your insurance submission was rejected. ${reason ? `Reason: ${reason}` : "Please upload an updated document."}`
        : action === "APPROVE"
          ? "Congratulations! Your chef profile has been verified."
          : `Your verification request was rejected. ${reason ? `Reason: ${reason}` : ""}`
    )

    return {
      chef: updatedChef,
      message: reviewType === "insurance"
        ? `Insurance ${action === "APPROVE" ? "approved" : "rejected"} successfully`
        : `Chef ${action === "APPROVE" ? "approved" : "rejected"} successfully`,
    }
  },
}
