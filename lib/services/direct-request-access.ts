export const DIRECT_REQUEST_EXCLUSIVITY_HOURS = 48
export const DIRECT_REQUEST_EXCLUSIVITY_MS = DIRECT_REQUEST_EXCLUSIVITY_HOURS * 60 * 60 * 1000

export type DirectInvitationLike = {
  chefId?: string | null
  status?: string | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
}

export type DirectProposalLike = {
  chefId?: string | null
  status?: string | null
}

export type DirectRequestLike = {
  invitations?: DirectInvitationLike[]
  proposals?: DirectProposalLike[]
}

function toDate(value?: Date | string | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

export function getDirectRequestReleaseAt(invitation: DirectInvitationLike) {
  const createdAt = toDate(invitation.createdAt)
  return createdAt ? new Date(createdAt.getTime() + DIRECT_REQUEST_EXCLUSIVITY_MS) : null
}

export function hasChefRespondedToDirectRequest(request: DirectRequestLike, invitation: DirectInvitationLike) {
  if (!invitation.chefId) return false
  if (invitation.status === "ACCEPTED") return true

  return (request.proposals ?? []).some((proposal) =>
    proposal.chefId === invitation.chefId &&
    proposal.status !== "WITHDRAWN" &&
    proposal.status !== "EXPIRED"
  )
}

export function getActiveDirectExclusivity(request: DirectRequestLike, now = new Date()) {
  const invitations = request.invitations ?? []

  return invitations.find((invitation) => {
    if (invitation.status === "DECLINED") return false
    if (hasChefRespondedToDirectRequest(request, invitation)) return true

    const releaseAt = getDirectRequestReleaseAt(invitation)
    return !releaseAt || releaseAt.getTime() > now.getTime()
  }) ?? null
}

export function isDirectRequestReleasedToLocalChefs(request: DirectRequestLike, now = new Date()) {
  const invitations = request.invitations ?? []
  if (invitations.length === 0) return false
  if (getActiveDirectExclusivity(request, now)) return false

  return invitations.every((invitation) => {
    if (invitation.status === "DECLINED") return true
    if (hasChefRespondedToDirectRequest(request, invitation)) return false
    const releaseAt = getDirectRequestReleaseAt(invitation)
    return Boolean(releaseAt && releaseAt.getTime() <= now.getTime())
  })
}
