/**
 * Centralized Moderation Guard
 * 
 * Provides unified moderation enforcement across all services and APIs.
 * Ensures banned/suspended users cannot perform business actions.
 */

import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/error-handler'

export type ModerationCheckResult = {
  allowed: boolean
  reason?: string
  user?: {
    id: string
    isBanned: boolean
    banReason?: string | null
    role?: string | null
  }
  chefProfile?: {
    id: string
    isBanned: boolean
    banReason?: string | null
  }
}

/**
 * Check if a user is allowed to perform business actions
 */
export async function checkUserModerationStatus(userId: string): Promise<ModerationCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isBanned: true,
      banReason: true,
      role: true,
    },
  })

  if (!user) {
    return {
      allowed: false,
      reason: 'USER_NOT_FOUND',
    }
  }

  if (user.isBanned) {
    return {
      allowed: false,
      reason: 'ACCOUNT_SUSPENDED',
      user: {
        id: user.id,
        isBanned: user.isBanned,
        banReason: user.banReason,
        role: user.role,
      },
    }
  }

  return {
    allowed: true,
    user,
  }
}

/**
 * Check if a chef profile is allowed to perform business actions
 */
export async function checkChefModerationStatus(chefId: string): Promise<ModerationCheckResult> {
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { id: chefId },
    select: {
      id: true,
      isBanned: true,
      banReason: true,
      user: {
        select: {
          id: true,
          isBanned: true,
          banReason: true,
          role: true,
        },
      },
    },
  })

  if (!chefProfile) {
    return {
      allowed: false,
      reason: 'CHEF_PROFILE_NOT_FOUND',
    }
  }

  if (chefProfile.isBanned || chefProfile.user?.isBanned) {
    return {
      allowed: false,
      reason: 'CHEF_BANNED',
      chefProfile: {
        id: chefProfile.id,
        isBanned: chefProfile.isBanned,
        banReason: chefProfile.banReason,
      },
    }
  }

  return {
    allowed: true,
    chefProfile,
  }
}

/**
 * Check user moderation status and throw error if not allowed
 * Use this in services to enforce moderation
 */
export async function enforceUserModeration(userId: string): Promise<void> {
  const result = await checkUserModerationStatus(userId)

  if (!result.allowed) {
    switch (result.reason) {
      case 'USER_NOT_FOUND':
        throw new ApiError(404, 'User not found')
      case 'ACCOUNT_SUSPENDED':
        throw new ApiError(403, 'ACCOUNT_SUSPENDED')
      default:
        throw new ApiError(403, 'ACCOUNT_SUSPENDED')
    }
  }
}

/**
 * Check chef moderation status and throw error if not allowed
 * Use this in services to enforce moderation
 */
export async function enforceChefModeration(chefId: string): Promise<void> {
  const result = await checkChefModerationStatus(chefId)

  if (!result.allowed) {
    switch (result.reason) {
      case 'CHEF_PROFILE_NOT_FOUND':
        throw new ApiError(404, 'Chef profile not found')
      case 'CHEF_BANNED':
        throw new ApiError(403, 'CHEF_ACCOUNT_SUSPENDED')
      default:
        throw new ApiError(403, 'CHEF_ACCOUNT_SUSPENDED')
    }
  }
}

/**
 * Check both user and chef moderation status
 * Useful for operations involving both parties
 */
export async function enforceBothPartiesModeration(userId: string, chefId: string): Promise<void> {
  await Promise.all([
    enforceUserModeration(userId),
    enforceChefModeration(chefId),
  ])
}

/**
 * Get chef profile ID from user ID and enforce moderation
 * Helper for services that have userId but need chefProfile
 */
export async function getChefProfileAndEnforceModeration(userId: string): Promise<string> {
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId },
    select: { id: true, isBanned: true, banReason: true },
  })

  if (!chefProfile) {
    throw new ApiError(404, 'Chef profile not found')
  }

  if (chefProfile.isBanned) {
    throw new ApiError(403, 'CHEF_ACCOUNT_SUSPENDED')
  }

  return chefProfile.id
}
