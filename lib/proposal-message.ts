export const PROPOSAL_MESSAGE_MIN_LENGTH = 10
export const PROPOSAL_MESSAGE_MAX_LENGTH = 20000

export function isProposalMessageLengthValid(message: string) {
  const trimmed = message.trim()
  return trimmed.length >= PROPOSAL_MESSAGE_MIN_LENGTH && message.length <= PROPOSAL_MESSAGE_MAX_LENGTH
}

export function assertProposalMessageLength(message: string) {
  if (message.trim().length < PROPOSAL_MESSAGE_MIN_LENGTH) {
    throw new Error(`PROPOSAL_MESSAGE_TOO_SHORT:${PROPOSAL_MESSAGE_MIN_LENGTH}`)
  }

  if (message.length > PROPOSAL_MESSAGE_MAX_LENGTH) {
    throw new Error(`PROPOSAL_MESSAGE_TOO_LONG:${PROPOSAL_MESSAGE_MAX_LENGTH}`)
  }
}

export function sanitizeProposalMessage(message: string) {
  return message.replace(/\r\n/g, "\n").trim()
}
