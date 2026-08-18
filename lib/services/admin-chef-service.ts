import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { sendPreferenceAwareEmail } from "@/lib/email"

type ChefReviewStatus = "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"

const statusMessages: Record<ChefReviewStatus, { action: string; notificationType: "VERIFICATION_APPROVED" | "VERIFICATION_REJECTED" | "VERIFICATION_CHANGES_REQUESTED"; subject: string; message: string }> = {
  APPROVED: {
    action: "CHEF_APPROVED",
    notificationType: "VERIFICATION_APPROVED",
    subject: "Your ChefaChef profile has been approved",
    message: "Your chef profile has been approved. You can now be shown in eligible marketplace areas.",
  },
  REJECTED: {
    action: "CHEF_REJECTED",
    notificationType: "VERIFICATION_REJECTED",
    subject: "Your ChefaChef profile was not approved",
    message: "Your chef profile was not approved. Please review the admin feedback and contact support if needed.",
  },
  CHANGES_REQUESTED: {
    action: "CHEF_CHANGES_REQUESTED",
    notificationType: "VERIFICATION_CHANGES_REQUESTED",
    subject: "Changes requested for your ChefaChef profile",
    message: "Admin has requested changes to your chef profile. Please update your profile and resubmit for review.",
  },
}

export const adminChefService = {
  async getChefForReview(chefId: string) {
    const chef = await prisma.chefProfile.findUnique({
      where: { id: chefId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            surname: true,
            email: true,
            phone: true,
            verified: true,
            isBanned: true,
            banReason: true,
            termsAcceptedAt: true,
            termsVersion: true,
            createdAt: true,
          },
        },
        experiences: {
          select: {
            id: true,
            title: true,
            isActive: true,
            price: true,
            currency: true,
          },
          orderBy: { createdAt: "desc" },
        },
        menus: {
          select: {
            id: true,
            title: true,
            cuisineType: true,
            menuImage: true,
            eventType: true,
          },
          orderBy: { createdAt: "desc" },
        },
        backgroundChecks: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
            experiences: true,
            menus: true,
          },
        },
      },
    })

    if (!chef) {
      throw new Error("CHEF_NOT_FOUND")
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "ChefProfile", entityId: chefId },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return { ...chef, auditLogs }
  },

  approveChef(chefId: string, actorId = "SYSTEM", reason?: string) {
    return updateChefReviewStatus(chefId, "APPROVED", actorId, reason ?? "Chef approved from admin workspace")
  },

  rejectChef(chefId: string, actorId = "SYSTEM", reason?: string) {
    return updateChefReviewStatus(chefId, "REJECTED", actorId, reason ?? "Chef application rejected from admin workspace")
  },

  requestChanges(chefId: string, actorId = "SYSTEM", reason?: string) {
    return updateChefReviewStatus(chefId, "CHANGES_REQUESTED", actorId, reason ?? "Chef profile changes requested from admin workspace")
  },
}

async function updateChefReviewStatus(chefId: string, status: ChefReviewStatus, actorId: string, reason: string) {
  const existing = await prisma.chefProfile.findUnique({
    where: { id: chefId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error("CHEF_NOT_FOUND")
  }

  const approved = status === "APPROVED"
  const chef = await prisma.$transaction(async (tx) => {
    const updated = await tx.chefProfile.update({
      where: { id: chefId },
      data: {
        isApproved: approved,
        verificationStatus: status,
        approvedAt: approved ? new Date() : null,
        approvedBy: approved ? actorId : null,
        reviewedAt: new Date(),
        reviewedBy: actorId,
        reviewNotes: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    await tx.auditLog.create({
      data: {
        action: statusMessages[status].action,
        entityType: "ChefProfile",
        entityId: chefId,
        oldValue: JSON.stringify({
          isApproved: existing.isApproved,
          verified: existing.verified,
          verificationStatus: existing.verificationStatus,
        }),
        newValue: JSON.stringify({
          isApproved: updated.isApproved,
          verified: updated.verified,
          verificationStatus: updated.verificationStatus,
          reviewNotes: updated.reviewNotes,
        }),
        performedBy: actorId,
        reason,
      },
    })

    return updated
  })

  const notification = statusMessages[status]
  await createNotification(chef.user.id, notification.notificationType, notification.message).catch((error) => {
    console.error("Chef review notification failed", error)
  })
  await sendPreferenceAwareEmail({
    userId: chef.user.id,
    topic: "requests",
    email: chef.user.email,
    subject: notification.subject,
    html: `<p>Hi ${chef.user.name},</p><p>${notification.message}</p><p><strong>Admin note:</strong> ${escapeHtml(reason)}</p><p>Best regards,<br>The ChefaChef Team</p>`,
  }).catch((error) => {
    console.error("Chef review email failed", error)
  })

  return chef
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
