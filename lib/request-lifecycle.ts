import { ProposalStatus } from "@/types"

const LOCKED_PROPOSAL_STATUSES = new Set<string>([
  ProposalStatus.ACCEPTED_PENDING_PAYMENT,
  ProposalStatus.ACCEPTED,
  ProposalStatus.BOOKED,
])

export function getClientRequestStatusLabel(proposalCount?: number | null) {
  return proposalCount && proposalCount > 0 ? "Live" : "Awaiting Chef Proposals"
}

export function hasLockedRequestProposalStatus(proposals?: Array<{ status?: string | null }> | null) {
  return (proposals ?? []).some((proposal) => proposal.status != null && LOCKED_PROPOSAL_STATUSES.has(proposal.status))
}

export function canEditRequestFully(requestMode?: string | null, proposalCount?: number | null) {
  return requestMode === "STANDARD" && (proposalCount ?? 0) === 0
}

export function canEditRequestNotes(requestMode?: string | null, proposals?: Array<{ status?: string | null }> | null) {
  if (requestMode !== "STANDARD") {
    return false
  }

  return !hasLockedRequestProposalStatus(proposals)
}
