import { ProposalStatus, Role } from "@/types"
import { proposalRepository } from "@/lib/repositories/proposal-repository"
import { emailTemplates, sendPreferenceAwareEmail } from "@/lib/email"
import {
  triggerProposalAcceptedNotification,
  triggerProposalNotification,
  triggerProposalRejectedNotification,
} from "@/lib/notifications"
import { prisma } from "@/lib/prisma"

// Proposal state machine constants
const PROPOSAL_STATUS = {
  PENDING: "PENDING",
  ACCEPTED_PENDING_PAYMENT: "ACCEPTED_PENDING_PAYMENT",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  WITHDRAWN: "WITHDRAWN",
  BOOKED: "BOOKED"
} as const

const PROPOSAL_EXPIRY_HOURS = 72 // 3 days

export const proposalService = {
  async createProposal(userId: string, userName: string | null | undefined, input: { requestId: string; price: number; message: string }) {
    const chefProfile = await proposalRepository.findChefProfileByUserId(userId)

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    const targetRequest = await proposalRepository.findRequestWithClient(input.requestId)

    if (!targetRequest) {
      throw new Error("REQUEST_NOT_FOUND")
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + PROPOSAL_EXPIRY_HOURS)

    const created = await proposalRepository.createProposal({
      requestId: input.requestId,
      chefId: chefProfile.id,
      price: input.price,
      message: input.message,
      expiresAt,
    })

    await sendPreferenceAwareEmail({
      userId: targetRequest.clientId,
      topic: "requests",
      email: targetRequest.client.email || `${targetRequest.client.id}@example.com`,
      subject: `New Proposal Received for ${targetRequest.title}`,
      html: emailTemplates.newProposal(
        targetRequest.client.name,
        userName || "Chef",
        input.price,
        targetRequest.title
      ),
    }).catch(() => undefined)

    await triggerProposalNotification(targetRequest.clientId, userName ?? "Chef")

    return created
  },

  async listProposals(userId: string, role: string | null | undefined) {
    if (role === Role.CHEF) {
      const chefProfile = await proposalRepository.findChefProfileByUserId(userId)
      if (!chefProfile) {
        return []
      }

      const proposals = await proposalRepository.listProposalsForChef(chefProfile.id)
      return proposals.map((proposal) => ({
        ...proposal,
        chef: {
          ...proposal.chef,
          name: proposal.chef.user?.name ?? null,
        },
      }))
    }

    const proposals = await proposalRepository.listProposalsForClient(userId)
    return proposals.map((proposal) => {
      const reviews = proposal.chef.reviews || []
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0
      
      return {
        ...proposal,
        chef: {
          ...proposal.chef,
          name: proposal.chef.user?.name ?? null,
          rating: averageRating,
        },
      }
    })
  },

  async resolveProposal(userId: string, proposalId: string, status: "ACCEPTED" | "REJECTED") {
    const existing = await proposalRepository.findProposalForResolution(proposalId)

    if (!existing) {
      throw new Error("PROPOSAL_NOT_FOUND")
    }

    if (existing.request.clientId !== userId) {
      throw new Error("FORBIDDEN")
    }

    if (existing.status !== ProposalStatus.PENDING) {
      throw new Error("PROPOSAL_ALREADY_RESOLVED")
    }

    const clientName = existing.request.client?.name ?? "Client"

    if (status === "ACCEPTED") {
      // ATOMIC: Accept proposal and reject all other proposals for this request
      return prisma.$transaction(async (tx) => {
        // Update accepted proposal to ACCEPTED_PENDING_PAYMENT
        const updated = await (tx as any).proposal.update({
          where: { id: proposalId },
          data: { status: PROPOSAL_STATUS.ACCEPTED_PENDING_PAYMENT },
          include: {
            chef: { include: { user: true } },
            request: { include: { client: true } }
          }
        })

        // Reject all other pending proposals for this request
        await (tx as any).proposal.updateMany({
          where: {
            requestId: existing.requestId,
            status: ProposalStatus.PENDING,
            id: { not: proposalId }
          },
          data: { status: PROPOSAL_STATUS.REJECTED }
        })

        const chefUser = updated.chef.user

        if (chefUser?.email) {
          await sendPreferenceAwareEmail({
            userId: updated.chef.userId,
            topic: "requests",
            email: chefUser.email,
            subject: `Proposal Accepted! 🎉`,
            html: emailTemplates.proposalAccepted(chefUser.name, clientName, updated.request.title),
          }).catch(() => undefined)
        }

        await triggerProposalAcceptedNotification(updated.chefId, clientName)
        return updated
      })
    }

    const updated = await proposalRepository.rejectProposal(proposalId)
    await triggerProposalRejectedNotification(updated.chefId, clientName)
    return updated
  },

  async expireProposal(proposalId: string) {
    const proposal = await proposalRepository.findProposalForResolution(proposalId)
    if (!proposal) {
      throw new Error("PROPOSAL_NOT_FOUND")
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new Error("PROPOSAL_NOT_PENDING")
    }

    return proposalRepository.updateProposalStatus(proposalId, PROPOSAL_STATUS.EXPIRED)
  },

  async checkAndExpireProposals() {
    const expiredProposals = await prisma.proposal.findMany({
      where: {
        status: ProposalStatus.PENDING,
        expiresAt: { lt: new Date() }
      }
    })

    if (expiredProposals.length === 0) {
      return { expired: 0 }
    }

    // Batch expire all stale proposals
    const result = await prisma.proposal.updateMany({
      where: {
        id: { in: expiredProposals.map(p => p.id) }
      },
      data: { status: PROPOSAL_STATUS.EXPIRED }
    })

    return { expired: result.count }
  },

  async withdrawProposal(userId: string, proposalId: string) {
    const proposal = await proposalRepository.findProposalForResolution(proposalId)
    if (!proposal) {
      throw new Error("PROPOSAL_NOT_FOUND")
    }

    const chefProfile = await proposalRepository.findChefProfileByUserId(userId)
    if (!chefProfile || chefProfile.id !== proposal.chefId) {
      throw new Error("FORBIDDEN")
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new Error("PROPOSAL_NOT_PENDING")
    }

    return proposalRepository.updateProposalStatus(proposalId, PROPOSAL_STATUS.WITHDRAWN)
  },
}
