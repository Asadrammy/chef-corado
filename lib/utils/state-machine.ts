/**
 * State Machine Utilities
 * Ensures valid state transitions for all critical entities
 */

import { logger } from "@/lib/logger"

// Booking State Machine
export const BookingStateMachine = {
  states: {
    DRAFT: "DRAFT",
    PENDING_PAYMENT: "PENDING_PAYMENT",
    CONFIRMED: "CONFIRMED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    SETTLED: "SETTLED",
    CANCELLED: "CANCELLED",
    NO_SHOW: "NO_SHOW",
  } as const,

  transitions: {
    DRAFT: ["PENDING_PAYMENT", "CANCELLED"],
    PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: ["SETTLED", "CANCELLED"],
    SETTLED: [], // Terminal state
    CANCELLED: [], // Terminal state
    NO_SHOW: ["SETTLED"], // Can still be settled
  } as const,

  validateTransition(from: string, to: string): boolean {
    const allowedTransitions = this.transitions[from as keyof typeof this.transitions]
    if (!allowedTransitions) return false
    return (allowedTransitions as readonly string[]).includes(to)
  },

  getAllowedTransitions(from: string): string[] {
    return [...(this.transitions[from as keyof typeof this.transitions] || [])]
  },
}

// Payment State Machine
export const PaymentStateMachine = {
  states: {
    INITIATED: "INITIATED",
    HELD: "HELD",
    AUTHORIZED: "AUTHORIZED",
    CAPTURED: "CAPTURED",
    PAID: "PAID",
    RELEASED: "RELEASED",
    REFUNDED: "REFUNDED",
    FAILED: "FAILED",
    DISPUTED: "DISPUTED",
  } as const,

  transitions: {
    INITIATED: ["HELD", "FAILED"],
    HELD: ["AUTHORIZED", "FAILED"],
    AUTHORIZED: ["CAPTURED", "FAILED"],
    CAPTURED: ["PAID", "FAILED"],
    PAID: ["RELEASED", "REFUNDED", "DISPUTED"],
    RELEASED: ["REFUNDED", "DISPUTED"],
    REFUNDED: [], // Terminal state
    FAILED: [], // Terminal state
    DISPUTED: ["REFUNDED", "RELEASED"], // Can be resolved either way
  } as const,

  validateTransition(from: string, to: string): boolean {
    const allowedTransitions = this.transitions[from as keyof typeof this.transitions]
    if (!allowedTransitions) return false
    return (allowedTransitions as readonly string[]).includes(to)
  },

  getAllowedTransitions(from: string): string[] {
    return [...(this.transitions[from as keyof typeof this.transitions] || [])]
  },
}

// Proposal State Machine
export const ProposalStateMachine = {
  states: {
    SUBMITTED: "SUBMITTED",
    ACCEPTED_PENDING_PAYMENT: "ACCEPTED_PENDING_PAYMENT",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    EXPIRED: "EXPIRED",
    WITHDRAWN: "WITHDRAWN",
    BOOKED: "BOOKED",
  } as const,

  transitions: {
    SUBMITTED: ["ACCEPTED_PENDING_PAYMENT", "REJECTED", "EXPIRED", "WITHDRAWN"],
    ACCEPTED_PENDING_PAYMENT: ["BOOKED", "EXPIRED"],
    ACCEPTED: ["BOOKED", "CANCELLED"],
    REJECTED: [], // Terminal state
    EXPIRED: [], // Terminal state
    WITHDRAWN: [], // Terminal state
    BOOKED: [], // Terminal state
  } as const,

  validateTransition(from: string, to: string): boolean {
    const allowedTransitions = this.transitions[from as keyof typeof this.transitions]
    if (!allowedTransitions) return false
    return (allowedTransitions as readonly string[]).includes(to)
  },

  getAllowedTransitions(from: string): string[] {
    return [...(this.transitions[from as keyof typeof this.transitions] || [])]
  },
}

// Dispute State Machine
export const DisputeStateMachine = {
  states: {
    OPEN: "OPEN",
    INVESTIGATING: "INVESTIGATING",
    RESOLVED_CLIENT_FAVOR: "RESOLVED_CLIENT_FAVOR",
    RESOLVED_CHEF_FAVOR: "RESOLVED_CHEF_FAVOR",
    CLOSED: "CLOSED",
  } as const,

  transitions: {
    OPEN: ["INVESTIGATING", "RESOLVED_CLIENT_FAVOR", "RESOLVED_CHEF_FAVOR", "CLOSED"],
    INVESTIGATING: ["RESOLVED_CLIENT_FAVOR", "RESOLVED_CHEF_FAVOR", "CLOSED"],
    RESOLVED_CLIENT_FAVOR: ["CLOSED"],
    RESOLVED_CHEF_FAVOR: ["CLOSED"],
    CLOSED: [], // Terminal state
  } as const,

  validateTransition(from: string, to: string): boolean {
    const allowedTransitions = this.transitions[from as keyof typeof this.transitions]
    if (!allowedTransitions) return false
    return (allowedTransitions as readonly string[]).includes(to)
  },

  getAllowedTransitions(from: string): string[] {
    return [...(this.transitions[from as keyof typeof this.transitions] || [])]
  },
}

// State Transition Logger
export async function logStateTransition(
  prisma: any,
  entityType: string,
  entityId: string,
  fromState: string,
  toState: string,
  triggeredBy: string,
  reason?: string
) {
  try {
    await prisma.stateTransition.create({
      data: {
        entityType,
        entityId,
        fromState,
        toState,
        triggeredBy,
        reason,
      },
    })

    logger.info(`[STATE] ${entityType} ${entityId}: ${fromState} -> ${toState}`, {
      entityType,
      entityId,
      fromState,
      toState,
      triggeredBy,
    })
  } catch (error) {
    logger.error("[STATE] Failed to log state transition:", { error, entityType, entityId })
    // Don't throw - state logging shouldn't block operations
  }
}

// State Transition Validator with strict enforcement
export function validateStateTransition(
  stateMachine: { validateTransition: (from: string, to: string) => boolean },
  entityType: string,
  entityId: string,
  fromState: string,
  toState: string,
  options?: { allowSameState?: boolean }
): { valid: boolean; error?: string } {
  // Allow same state transitions if configured (for idempotent operations)
  if (options?.allowSameState && fromState === toState) {
    return { valid: true }
  }

  // Check if transition is valid
  if (!stateMachine.validateTransition(fromState, toState)) {
    const error = `INVALID_STATE_TRANSITION: ${entityType} ${entityId} cannot transition from ${fromState} to ${toState}`
    logger.error(`[STATE] ${error}`)
    return { valid: false, error }
  }

  return { valid: true }
}
