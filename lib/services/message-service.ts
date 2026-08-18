import { messageRepository } from "@/lib/repositories/message-repository"
import { triggerMessageNotification } from "@/lib/notifications"
import { ProposalStatus, Role } from "@/types"
import { validateMessageContent } from "@/lib/security/communication-policy"
import { enforceUserModeration } from "@/lib/security/moderation-guard"
import { enforceChefCompliance, enforceClientCompliance } from "@/lib/security/legal-compliance"
import { assertRequestCanReceiveQuote } from "@/lib/services/quote-limit-service"

const PROPOSAL_EXPIRY_HOURS = 72
const EDITABLE_PROPOSAL_STATUSES = new Set<string>([
  ProposalStatus.PENDING,
  ProposalStatus.REJECTED,
  ProposalStatus.EXPIRED,
  ProposalStatus.WITHDRAWN,
])

type MessageActor = {
  id: string
  name: string | null
  role?: string | null
}

type RepositoryMessage = {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: Date
  proposalId?: string | null
  isRead?: boolean
  sender: MessageActor
  receiver: MessageActor
}

function buildProposalMap<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]))
}

export const messageService = {
  async createMessage(senderId: string, receiverId: string, content: string, proposalId?: string | null) {
    // Enforce moderation - sender must not be banned
    await enforceUserModeration(senderId)

    // Enforce communication policy - block prohibited content
    validateMessageContent(content)

    // Enforce legal compliance based on role
    const sender = await messageRepository.findUserById(senderId)
    if (!sender) {
      throw new Error("SENDER_NOT_FOUND")
    }

    if (sender.role === Role.CHEF) {
      await enforceChefCompliance(senderId)
    } else {
      await enforceClientCompliance(senderId)
    }

    const receiver = await messageRepository.findUserById(receiverId)

    if (!receiver) {
      throw new Error("RECEIVER_NOT_FOUND")
    }

    const message = (await messageRepository.createMessage(senderId, receiverId, content, proposalId)) as unknown as RepositoryMessage
    await triggerMessageNotification(receiverId, message.sender.name ?? "User")

    return message
  },

  async listConversationMessages(userId: string, otherUserId: string) {
    await messageRepository.markConversationAsRead(userId, otherUserId)

    const [messages, otherUser] = await Promise.all([
      messageRepository.listConversationMessages(userId, otherUserId),
      messageRepository.findUserById(otherUserId),
    ])
    const normalizedMessages = messages as unknown as RepositoryMessage[]

    const proposalIds = Array.from(
      new Set(normalizedMessages.map((message) => message.proposalId).filter((proposalId): proposalId is string => Boolean(proposalId)))
    )

    const proposals = proposalIds.length > 0 ? await messageRepository.findProposalsByIds(proposalIds) : []
    const proposalsById = buildProposalMap(proposals)

    const [latestProposal, latestBooking] = await messageRepository.findConversationContext(userId, otherUserId)

    return {
      otherUser,
      context: {
        request: latestProposal?.request ?? latestBooking?.proposal?.request ?? null,
        activeProposal: latestProposal
          ? {
              id: latestProposal.id,
              price: latestProposal.price,
              currency: latestProposal.currency,
              message: latestProposal.message,
              status: latestProposal.status,
              expiresAt: latestProposal.expiresAt?.toISOString() ?? null,
              request: latestProposal.request
                ? {
                    id: latestProposal.request.id,
                    title: latestProposal.request.title,
                    eventDate: latestProposal.request.eventDate.toISOString(),
                    location: latestProposal.request.location,
                    budget: latestProposal.request.budget,
                    currency: latestProposal.request.currency,
                    details: latestProposal.request.details,
                  }
                : null,
            }
          : null,
        latestBooking: latestBooking
          ? {
              id: latestBooking.id,
              eventDate: latestBooking.eventDate.toISOString(),
              location: latestBooking.location,
              totalPrice: latestBooking.totalPrice,
              currency: latestBooking.currency,
              status: latestBooking.status,
              clientId: latestBooking.clientId,
              guestCount: latestBooking.guestCount,
              adultCount: latestBooking.adultCount,
              childrenUnder10: latestBooking.childrenUnder10,
            }
          : null,
      },
      messages: normalizedMessages.map((message) => {
        const proposal = message.proposalId ? proposalsById.get(message.proposalId) : null

        return {
          ...message,
          createdAt: message.createdAt.toISOString(),
          proposal: proposal
            ? {
                id: proposal.id,
                price: proposal.price,
                currency: proposal.currency,
                message: proposal.message,
                status: proposal.status,
                createdAt: proposal.createdAt.toISOString(),
                expiresAt: proposal.expiresAt?.toISOString() ?? null,
                request: proposal.request
                  ? {
                      id: proposal.request.id,
                      title: proposal.request.title,
                      eventDate: proposal.request.eventDate.toISOString(),
                      location: proposal.request.location,
                      budget: proposal.request.budget,
                      currency: proposal.request.currency,
                      details: proposal.request.details,
                    }
                  : null,
              }
            : null,
        }
      }),
    }
  },

  async listConversations(userId: string) {
    const conversations = (await messageRepository.listConversations(userId)) as unknown as RepositoryMessage[]
    const groupedConversations = new Map<string, {
      otherUser: { id: string; name: string | null; role?: string | null }
      lastMessage: typeof conversations[number]
      unreadCount: number
    }>()

    for (const message of conversations) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId
      const otherUser = message.senderId === userId ? message.receiver : message.sender

      if (!groupedConversations.has(otherUserId)) {
        groupedConversations.set(otherUserId, {
          otherUser,
          lastMessage: message,
          unreadCount: 0,
        })
      }

      if (message.receiverId === userId && !message.isRead) {
        const existing = groupedConversations.get(otherUserId)
        if (existing) {
          existing.unreadCount += 1
        }
      }
    }

    return Array.from(groupedConversations.values()).map((conversation) => ({
      otherUser: conversation.otherUser,
      lastMessage: {
        id: conversation.lastMessage.id,
        content: conversation.lastMessage.content,
        createdAt: conversation.lastMessage.createdAt.toISOString(),
        proposalId: conversation.lastMessage.proposalId,
      },
      unreadCount: conversation.unreadCount,
    }))
  },

  async sendConversationQuote(input: {
    senderId: string
    receiverId: string
    requestId: string
    price: number
    message: string
  }) {
    // Enforce moderation
    await enforceUserModeration(input.senderId)

    // Enforce communication policy on quote message
    validateMessageContent(input.message)

    // Enforce chef compliance (terms + structured legal confirmations + approval)
    await enforceChefCompliance(input.senderId)

    // Enforce unified quote limit (10 quotes per request)
    await assertRequestCanReceiveQuote(input.requestId)

    const sender = await messageRepository.findUserById(input.senderId)
    const receiver = await messageRepository.findUserById(input.receiverId)

    if (!sender || sender.role !== Role.CHEF) {
      throw new Error("FORBIDDEN")
    }

    if (!receiver) {
      throw new Error("RECEIVER_NOT_FOUND")
    }

    const chefProfile = await messageRepository.findChefProfileByUserId(input.senderId)

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    const request = await messageRepository.findRequestForChefClientConversation(input.requestId, input.senderId, input.receiverId)

    if (!request || request.clientId !== input.receiverId) {
      throw new Error("REQUEST_NOT_FOUND")
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + PROPOSAL_EXPIRY_HOURS)

    // Use request currency to ensure consistency
    const currency = request.currency || "GBP"

    const proposal = await messageRepository.createProposalForConversationAtomically({
      requestId: input.requestId,
      chefId: chefProfile.id,
      price: input.price,
      currency,
      message: input.message,
      expiresAt,
    })

    const chatMessage = await this.createMessage(
      input.senderId,
      input.receiverId,
      `Quote sent: ${request.title}`,
      proposal.id
    )

    return {
      proposal: {
        id: proposal.id,
        price: proposal.price,
        currency: proposal.currency,
        message: proposal.message,
        status: proposal.status,
        createdAt: proposal.createdAt.toISOString(),
        expiresAt: proposal.expiresAt?.toISOString() ?? null,
        request: {
          id: proposal.request.id,
          title: proposal.request.title,
          eventDate: proposal.request.eventDate.toISOString(),
          location: proposal.request.location,
          budget: proposal.request.budget,
          currency: proposal.request.currency,
          details: proposal.request.details,
        },
      },
      message: {
        ...chatMessage,
        createdAt: chatMessage.createdAt.toISOString(),
      },
    }
  },

  async updateConversationQuote(input: {
    senderId: string
    receiverId: string
    proposalId: string
    price: number
    message: string
  }) {
    // Enforce moderation
    await enforceUserModeration(input.senderId)

    // Enforce communication policy on quote message
    validateMessageContent(input.message)

    // Enforce chef compliance (terms + structured legal confirmations + approval)
    await enforceChefCompliance(input.senderId)

    const proposal = await messageRepository.findProposalOwnedByChef(input.proposalId, input.senderId)

    if (!proposal) {
      throw new Error("PROPOSAL_NOT_FOUND")
    }

    if (proposal.request.clientId !== input.receiverId) {
      throw new Error("FORBIDDEN")
    }

    if (!EDITABLE_PROPOSAL_STATUSES.has(proposal.status)) {
      throw new Error("PROPOSAL_NOT_EDITABLE")
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + PROPOSAL_EXPIRY_HOURS)

    const updatedProposal = await messageRepository.updateConversationProposal(input.proposalId, proposal.chefId, {
      price: input.price,
      message: input.message,
      expiresAt,
    })

    const chatMessage = await this.createMessage(
      input.senderId,
      input.receiverId,
      `Quote updated: ${proposal.request.title}`,
      updatedProposal.id
    )

    return {
      proposal: {
        id: updatedProposal.id,
        price: updatedProposal.price,
        currency: updatedProposal.currency,
        message: updatedProposal.message,
        status: updatedProposal.status,
        createdAt: updatedProposal.createdAt.toISOString(),
        expiresAt: updatedProposal.expiresAt?.toISOString() ?? null,
        request: {
          id: updatedProposal.request.id,
          title: updatedProposal.request.title,
          eventDate: updatedProposal.request.eventDate.toISOString(),
          location: updatedProposal.request.location,
          budget: updatedProposal.request.budget,
          currency: updatedProposal.request.currency,
          details: updatedProposal.request.details,
        },
      },
      message: {
        ...chatMessage,
        createdAt: chatMessage.createdAt.toISOString(),
      },
    }
  },
}
