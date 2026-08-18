import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

export const PROPOSAL_CHECKOUT_LOCK_TYPE = "PROPOSAL_CHECKOUT"
export const PROPOSAL_CHECKOUT_LOCK_TTL_SECONDS = 31 * 60

function lockId(proposalId: string, availabilityId: string) {
  return `proposal_checkout_${proposalId}_${availabilityId}`
}

export function isProposalCheckoutLockOwner(lock: { id: string }, proposalId: string) {
  return lock.id.startsWith(`proposal_checkout_${proposalId}_`)
}

export async function cleanupExpiredProposalCheckoutLocks(tx: any = prisma) {
  return tx.slotLock.deleteMany({
    where: {
      lockType: PROPOSAL_CHECKOUT_LOCK_TYPE,
      expiresAt: { lt: new Date() },
    },
  })
}

export async function acquireProposalCheckoutLocks(input: {
  proposalId: string
  availabilityIds: string[]
  ttlSeconds?: number
}) {
  const ttlSeconds = input.ttlSeconds ?? PROPOSAL_CHECKOUT_LOCK_TTL_SECONDS
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

  await cleanupExpiredProposalCheckoutLocks()

  try {
    await prisma.$transaction(async (tx) => {
      for (const availabilityId of input.availabilityIds) {
        await tx.slotLock.create({
          data: {
            id: lockId(input.proposalId, availabilityId),
            availabilityId,
            lockType: PROPOSAL_CHECKOUT_LOCK_TYPE,
            expiresAt,
          },
        })
      }
    })

    logger.info("[PROPOSAL_CHECKOUT_LOCKS] Locks acquired", {
      proposalId: input.proposalId,
      availabilityIds: input.availabilityIds,
      expiresAt: expiresAt.toISOString(),
    })

    return { acquired: true, expiresAt }
  } catch (error) {
    logger.warn("[PROPOSAL_CHECKOUT_LOCKS] Lock acquisition failed", {
      proposalId: input.proposalId,
      availabilityIds: input.availabilityIds,
      error: error instanceof Error ? error.message : String(error),
    })
    await releaseProposalCheckoutLocks(input.proposalId)
    return { acquired: false, expiresAt }
  }
}

export async function findBlockingProposalCheckoutLocks(input: {
  proposalId: string
  availabilityIds: string[]
  tx?: any
}) {
  const tx = input.tx ?? prisma
  await cleanupExpiredProposalCheckoutLocks(tx)

  const locks = await tx.slotLock.findMany({
    where: {
      availabilityId: { in: input.availabilityIds },
      lockType: PROPOSAL_CHECKOUT_LOCK_TYPE,
      expiresAt: { gt: new Date() },
    },
  })

  return locks.filter((lock: { id: string }) => !isProposalCheckoutLockOwner(lock, input.proposalId))
}

export async function releaseProposalCheckoutLocks(proposalId: string, tx: any = prisma) {
  try {
    const result = await tx.slotLock.deleteMany({
      where: {
        id: { startsWith: `proposal_checkout_${proposalId}_` },
        lockType: PROPOSAL_CHECKOUT_LOCK_TYPE,
      },
    })

    logger.info("[PROPOSAL_CHECKOUT_LOCKS] Locks released", {
      proposalId,
      count: result.count,
    })

    return result.count
  } catch (error) {
    logger.warn("[PROPOSAL_CHECKOUT_LOCKS] Lock release failed", {
      proposalId,
      error: error instanceof Error ? error.message : String(error),
    })
    return 0
  }
}
