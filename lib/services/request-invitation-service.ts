import { createNotification } from "@/lib/notifications"
import { requestInvitationRepository } from "@/lib/repositories/request-invitation-repository"

function serializeInvitation(invitation: Awaited<ReturnType<typeof requestInvitationRepository.listInvitationsForChef>>[number]) {
  return {
    id: invitation.id,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
    request: {
      id: invitation.request.id,
      title: invitation.request.title,
      description: invitation.request.description,
      eventDate: invitation.request.eventDate.toISOString(),
      location: invitation.request.location,
      budget: invitation.request.budget,
      details: invitation.request.details,
      client: {
        id: invitation.request.client.id,
        name: invitation.request.client.name,
      },
    },
  }
}

export const requestInvitationService = {
  async listInvitations(userId: string) {
    const chefProfile = await requestInvitationRepository.findChefProfileByUserId(userId)

    if (!chefProfile) {
      return { invitations: [] }
    }

    const invitations = await requestInvitationRepository.listInvitationsForChef(chefProfile.id)
    return { invitations: invitations.map(serializeInvitation) }
  },

  async respondToInvitation(userId: string, invitationId: string, status: "ACCEPTED" | "DECLINED") {
    const chefProfile = await requestInvitationRepository.findChefProfileByUserId(userId)

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    const invitation = await requestInvitationRepository.findInvitationByIdForChef(invitationId, chefProfile.id)

    if (!invitation) {
      throw new Error("INVITATION_NOT_FOUND")
    }

    if (invitation.status !== "PENDING") {
      throw new Error("INVITATION_ALREADY_RESOLVED")
    }

    const updated = await requestInvitationRepository.updateInvitationStatus(invitationId, status)

    await createNotification(
      updated.request.clientId,
      "PROPOSAL_RECEIVED",
      status === "ACCEPTED"
        ? `${updated.chef.user?.name ?? "Chef"} accepted your invitation for ${updated.request.title}`
        : `${updated.chef.user?.name ?? "Chef"} declined your invitation for ${updated.request.title}`
    )

    return serializeInvitation(updated)
  },
}
