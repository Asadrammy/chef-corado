import { ProposalStatus, Role } from "@/types"
import { proposalRepository } from "@/lib/repositories/proposal-repository"
import { emailTemplates, sendPreferenceAwareEmail } from "@/lib/email"
import {
  triggerProposalAcceptedNotification,
  triggerProposalNotification,
  triggerProposalRejectedNotification,
} from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { assertProposalMeetsActivePricingRule } from "@/lib/services/pricing-rule-service"
import { enforceUserModeration, enforceChefModeration } from "@/lib/security/moderation-guard"
import { enforceChefCompliance } from "@/lib/security/legal-compliance"
import { validateMessageContent } from "@/lib/security/communication-policy"
import { assertRequestCanReceiveQuote } from "@/lib/services/quote-limit-service"

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
  async createProposal(
    userId: string,
    userName: string | null | undefined,
    input: { requestId: string; price: number; message: string; menuId?: string | null }
  ) {
    // Enforce moderation - user must not be banned
    await enforceUserModeration(userId)

    // Enforce chef compliance (terms + structured legal confirmations + approval)
    await enforceChefCompliance(userId)

    // Enforce communication policy in proposal message
    validateMessageContent(input.message)

    // Enforce unified quote limit (10 quotes per request)
    await assertRequestCanReceiveQuote(input.requestId)

    const chefProfile = await proposalRepository.findChefProfileByUserId(userId)

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    // Enforce chef profile moderation
    await enforceChefModeration(chefProfile.id)

    if (input.menuId) {
      const ownedMenu = await proposalRepository.findOwnedMenu(input.menuId, chefProfile.id)
      if (!ownedMenu) {
        throw new Error("MENU_NOT_FOUND_OR_FORBIDDEN")
      }
    }

    const targetRequest = await proposalRepository.findRequestWithClient(input.requestId)

    if (!targetRequest) {
      throw new Error("REQUEST_NOT_FOUND")
    }

    await assertProposalMeetsActivePricingRule({
      request: targetRequest,
      proposalPrice: input.price,
    })

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + PROPOSAL_EXPIRY_HOURS)

    // Use request currency to ensure consistency (request should always have currency set)
    const currency = targetRequest.currency || "GBP"

    const created = await proposalRepository.createProposalAtomically({
      requestId: input.requestId,
      chefId: chefProfile.id,
      price: input.price,
      currency,
      message: input.message,
      menuId: input.menuId ?? null,
      expiresAt,
    })

    const requestTitle = targetRequest.title ?? "your request"

    await sendPreferenceAwareEmail({
      userId: targetRequest.clientId,
      topic: "requests",
      email: targetRequest.client.email || `${targetRequest.client.id}@example.com`,
      subject: `New Proposal Received for ${requestTitle}`,
      html: emailTemplates.newProposal(
        targetRequest.client.name,
        userName || "Chef",
        input.price,
        requestTitle,
        currency
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
          userId: proposal.chef.userId,
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
          reviewCount: reviews.length,
          profileImage: proposal.chef.profileImage ?? null,
          userId: proposal.chef.userId,
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
      const updated = await prisma.$transaction(async (tx) => {
        // Update accepted proposal to ACCEPTED_PENDING_PAYMENT
        const proposal = await (tx as any).proposal.update({
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

        return proposal
      })

      // Send email and create notification outside transaction
      const chefUser = updated.chef.user
      if (chefUser?.email) {
        await sendPreferenceAwareEmail({
          userId: updated.chef.userId,
          topic: "requests",
          email: chefUser.email,
          subject: "Proposal accepted",
          html: emailTemplates.proposalAccepted(chefUser.name, clientName, updated.request.title),
        }).catch(() => undefined)
      }

      await triggerProposalAcceptedNotification(updated.chef.userId, clientName).catch(() => undefined)
      return updated
    }

    const updated = await proposalRepository.rejectProposal(proposalId)
    await triggerProposalRejectedNotification(updated.chef.userId, clientName).catch(() => undefined)
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
