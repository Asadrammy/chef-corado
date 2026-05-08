import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

type UserAction = "ban" | "unban"

export const adminUserService = {
  async updateUserBanStatus(userId: string, action: UserAction, input?: { reason?: string; adminNotes?: string; bannedBy?: string }) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chefProfile: true,
      },
    })

    if (!user) {
      throw new Error("USER_NOT_FOUND")
    }

    const isBanned = action === "ban"
    const bannedAt = isBanned ? new Date() : null
    const reason = isBanned ? input?.reason?.trim() || null : null
    const adminNotes = isBanned ? input?.adminNotes?.trim() || null : null
    const bannedBy = isBanned ? input?.bannedBy || null : null

    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned,
        banReason: reason,
        banAdminNotes: adminNotes,
        bannedAt,
        bannedBy,
      } as any,
    })

    if (user.chefProfile) {
      await prisma.chefProfile.update({
        where: { id: user.chefProfile.id },
        data: {
          isBanned,
          banReason: reason,
          banAdminNotes: adminNotes,
          bannedAt,
          bannedBy,
          isApproved: isBanned ? false : user.chefProfile.isApproved,
        } as any,
      })
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        chefProfile: true,
      },
    })

    return {
      user: updatedUser,
      message: `User successfully ${isBanned ? "banned" : "unbanned"}`,
    }
  },

  async listUsers(status: string | null, role: string | null) {
    const where: Prisma.UserWhereInput = {}

    if (status === "banned") {
      where.isBanned = true
    } else if (status === "active") {
      where.isBanned = false
    }

    if (role) {
      where.role = role
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    })

    return Promise.all(
      users.map(async (user) => {
        const flags: string[] = []

        const [chefProfile, bookingCount] = await Promise.all([
          prisma.chefProfile.findUnique({
            where: { userId: user.id },
          }),
          prisma.booking.count({
            where: { clientId: user.id },
          }),
        ])

        const reviewCount = 0
        if (chefProfile && bookingCount > 5 && reviewCount === 0) {
          flags.push("No reviews despite bookings")
        }

        const daysSinceCreation = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceCreation < 7 && (bookingCount > 10 || reviewCount > 10)) {
          flags.push("Suspicious activity pattern")
        }

        if (chefProfile && !chefProfile.isApproved && bookingCount > 0) {
          flags.push("Unapproved chef with bookings")
        }

        return {
          ...user,
          chefProfile,
          flags,
          riskLevel: flags.length === 0 ? "low" : flags.length === 1 ? "medium" : "high",
          _count: {
            bookings: bookingCount,
            reviews: reviewCount,
          },
        }
      })
    )
  },
}
