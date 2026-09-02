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
import { marketConfigurationService } from "@/lib/services/market-configuration-service"
import { assertProposalMessageLength } from "@/lib/proposal-message"
import { getSafeClientGreetingName } from "@/lib/chef-request-view"
import { assertChefCanProposeForRequest } from "@/lib/services/request-eligibility-service"

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

function isMissingProposalLineItemTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes("ProposalLineItem") &&
    (message.includes("does not exist") || message.includes("P2021") || message.includes("TableDoesNotExist"))
  )
}

export const proposalService = {
  async createProposal(
    userId: string,
    userName: string | null | undefined,
    input: {
      requestId: string
      price: number
      message: string
      menuId?: string | null
      lineItems?: Array<{
        serviceDate?: string
        title: string
        description?: string
        price: number
      }>
    }
  ) {
    // Enforce moderation - user must not be banned
    await enforceUserModeration(userId)

    // Enforce chef compliance (terms + structured legal confirmations + approval)
    await enforceChefCompliance(userId)

    // Enforce communication policy in proposal message
    assertProposalMessageLength(input.message)
    validateMessageContent(input.message)

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

    await assertChefCanProposeForRequest(userId, input.requestId)

    await marketConfigurationService.assertBookingMarketEnabled(targetRequest.countryCode)

    const isMultiDayRequest = targetRequest.requestMode === "MULTI_DAY"
    const requestDateKeys = targetRequest.multiDayDates?.map((day: { date: Date }) => day.date.toISOString().slice(0, 10)) ?? []
    const lineItems = input.lineItems?.map((item, index) => ({
      serviceDate: item.serviceDate ? new Date(item.serviceDate) : null,
      dateKey: item.serviceDate ? new Date(item.serviceDate).toISOString().slice(0, 10) : null,
      title: item.title,
      description: item.description ?? null,
      price: item.price,
      currency: targetRequest.currency || "GBP",
      sortOrder: index,
    })) ?? []

    if (isMultiDayRequest) {
      if (lineItems.length !== requestDateKeys.length) {
        throw new Error("MULTI_DAY_PROPOSAL_LINE_ITEMS_REQUIRED")
      }

      const lineItemDateKeys = lineItems.map((item) => item.dateKey)
      if (
        new Set(lineItemDateKeys).size !== lineItemDateKeys.length ||
        requestDateKeys.sort().join("|") !== lineItemDateKeys.sort().join("|")
      ) {
        throw new Error("MULTI_DAY_PROPOSAL_LINE_ITEMS_MISMATCH")
      }

      const lineItemTotal = lineItems.reduce((sum, item) => sum + item.price, 0)
      if (Math.abs(lineItemTotal - input.price) > 0.01) {
        throw new Error("MULTI_DAY_PROPOSAL_TOTAL_MISMATCH")
      }
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
      lineItems: lineItems.map(({ dateKey, ...item }) => item),
    })

    const requestTitle = targetRequest.title ?? "your request"
    const multiDayNotificationContext = {
      isMultiDay: isMultiDayRequest,
      serviceDates: targetRequest.multiDayDates,
      location: targetRequest.location,
      amount: input.price,
      currency,
    }

    await sendPreferenceAwareEmail({
      userId: targetRequest.clientId,
      topic: "requests",
      email: targetRequest.client.email || `${targetRequest.client.id}@example.com`,
      subject: `New Proposal Received for ${requestTitle}`,
      html: isMultiDayRequest
        ? emailTemplates.newMultiDayProposal(
            targetRequest.client.name,
            userName || "Chef",
            input.price,
            requestTitle,
            currency,
            {
              serviceDates: targetRequest.multiDayDates,
              lineItems,
              budgetMode: targetRequest.budgetMode,
            }
          )
        : emailTemplates.newProposal(
            targetRequest.client.name,
            userName || "Chef",
            input.price,
            requestTitle,
            currency
          ),
    }).catch(() => undefined)

    await triggerProposalNotification(targetRequest.clientId, userName ?? "Chef", multiDayNotificationContext)

    return created
  },

  async listProposals(userId: string, role: string | null | undefined) {
    if (role === Role.CHEF) {
      const chefProfile = await proposalRepository.findChefProfileByUserId(userId)
      if (!chefProfile) {
        return []
      }

      let proposals
      try {
        proposals = await proposalRepository.listProposalsForChef(chefProfile.id)
      } catch (error) {
        if (!isMissingProposalLineItemTable(error)) {
          throw error
        }

        proposals = await proposalRepository.listProposalsForChefLegacy(chefProfile.id)
      }

      return proposals.map((proposal) => ({
        ...proposal,
        lineItems: "lineItems" in proposal ? proposal.lineItems : [],
        chef: {
          ...proposal.chef,
          name: proposal.chef.user?.name ?? null,
          userId: proposal.chef.userId,
        },
      }))
    }

    let proposals
    try {
      proposals = await proposalRepository.listProposalsForClient(userId)
    } catch (error) {
      if (!isMissingProposalLineItemTable(error)) {
        throw error
      }

      proposals = await proposalRepository.listProposalsForClientLegacy(userId)
    }

    return proposals.map((proposal) => {
      const reviews = proposal.chef.reviews || []
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0
      
    return {
      ...proposal,
      lineItems: "lineItems" in proposal ? proposal.lineItems : [],
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

    const clientName = getSafeClientGreetingName(existing.request.client)

    if (status === "ACCEPTED") {
      // ATOMIC: Accept proposal and reject all other proposals for this request
      const updated = await prisma.$transaction(async (tx) => {
        // Update accepted proposal to ACCEPTED_PENDING_PAYMENT
        const proposal = await (tx as any).proposal.update({
          where: { id: proposalId },
          data: { status: PROPOSAL_STATUS.ACCEPTED_PENDING_PAYMENT },
          include: {
            chef: { include: { user: true } },
            lineItems: { orderBy: { sortOrder: "asc" } },
            request: {
              include: {
                client: true,
                multiDayDates: { orderBy: { sortOrder: "asc" } },
              },
            },
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
      const isMultiDayRequest = updated.request.requestMode === "MULTI_DAY"
      const notificationContext = {
        isMultiDay: isMultiDayRequest,
        serviceDates: updated.request.multiDayDates,
        location: updated.request.location,
        amount: updated.price,
        currency: updated.currency,
      }
      if (chefUser?.email) {
        await sendPreferenceAwareEmail({
          userId: updated.chef.userId,
          topic: "requests",
          email: chefUser.email,
          subject: "Proposal accepted",
          html: isMultiDayRequest
            ? emailTemplates.multiDayProposalAccepted(
                chefUser.name,
                clientName,
                updated.request.title,
                updated.price,
                updated.currency,
                {
                  serviceDates: updated.request.multiDayDates,
                  lineItems: updated.lineItems,
                }
              )
            : emailTemplates.proposalAccepted(chefUser.name, clientName, updated.request.title),
        }).catch(() => undefined)
      }

      await triggerProposalAcceptedNotification(updated.chef.userId, clientName, notificationContext).catch(() => undefined)
      return updated
    }

    const updated = await proposalRepository.rejectProposal(proposalId)
    await triggerProposalRejectedNotification(updated.chef.userId, clientName, {
      isMultiDay: updated.request.requestMode === "MULTI_DAY",
      serviceDates: updated.request.multiDayDates,
      location: updated.request.location,
      amount: updated.price,
      currency: updated.currency,
    }).catch(() => undefined)
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
