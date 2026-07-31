/**
 * Legal Compliance Guard
 * 
 * Enforces terms acceptance and structured chef compliance requirements
 * before allowing critical business actions.
 */

import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/error-handler'
import { TERMS_VERSION } from '@/lib/request-options'

export type ComplianceCheckResult = {
  termsAccepted: boolean
  termsCurrent: boolean
  complianceConfirmed: boolean
  canProceed: boolean
  blockingReason?: string
  acceptedVia?: string | null
  approvalStatus?: string | null
}

/**
 * Check if user has accepted current terms
 */
export async function checkTermsAcceptance(userId: string): Promise<ComplianceCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      termsAcceptedAt: true,
      termsVersion: true,
      acceptedVia: true,
    },
  })

  if (!user) {
    return {
      termsAccepted: false,
      termsCurrent: false,
      complianceConfirmed: false,
      canProceed: false,
      blockingReason: 'USER_NOT_FOUND',
    }
  }

  const termsAccepted = !!user.termsAcceptedAt
  const termsCurrent = user.termsVersion === TERMS_VERSION && !!(user as any).acceptedVia

  return {
    termsAccepted,
    termsCurrent,
    complianceConfirmed: false,
    canProceed: termsAccepted && termsCurrent,
    blockingReason: !termsAccepted ? 'TERMS_NOT_ACCEPTED' : !termsCurrent ? 'TERMS_OUTDATED' : undefined,
    acceptedVia: (user as any).acceptedVia,
  }
}

/**
 * Check if chef has completed structured compliance and approval requirements
 */
export async function checkChefOperationalCompliance(userId: string): Promise<ComplianceCheckResult> {
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId },
    select: {
      rightToWorkUkConfirmed: true,
      foodHygieneLevel2Confirmed: true,
      foodHygieneCertificateUrl: true,
      foodHygieneCertificateReviewStatus: true,
      verificationStatus: true,
    },
  })

  if (!chefProfile) {
    return {
      termsAccepted: false,
      termsCurrent: false,
      complianceConfirmed: false,
      canProceed: false,
      blockingReason: 'CHEF_PROFILE_NOT_FOUND',
    }
  }

  const complianceConfirmed = Boolean(chefProfile.rightToWorkUkConfirmed) && Boolean(chefProfile.foodHygieneLevel2Confirmed)
  const verificationStatus = chefProfile.verificationStatus ?? 'PENDING'
  let blockingReason: string | undefined

  if (!chefProfile.rightToWorkUkConfirmed) {
    blockingReason = 'RIGHT_TO_WORK_CONFIRMATION_REQUIRED'
  } else if (!chefProfile.foodHygieneLevel2Confirmed) {
    blockingReason = 'FOOD_HYGIENE_CONFIRMATION_REQUIRED'
  } else if (!chefProfile.foodHygieneCertificateUrl) {
    blockingReason = 'FOOD_HYGIENE_CERTIFICATE_REQUIRED'
  } else if (chefProfile.foodHygieneCertificateReviewStatus !== 'APPROVED') {
    blockingReason = 'FOOD_HYGIENE_CERTIFICATE_APPROVAL_PENDING'
  } else if (verificationStatus === 'REJECTED') {
    blockingReason = 'CHEF_APPROVAL_REJECTED'
  } else if (verificationStatus !== 'APPROVED') {
    blockingReason = 'CHEF_APPROVAL_PENDING'
  }

  return {
    termsAccepted: false,
    termsCurrent: false,
    complianceConfirmed,
    canProceed:
      complianceConfirmed &&
      Boolean(chefProfile.foodHygieneCertificateUrl) &&
      chefProfile.foodHygieneCertificateReviewStatus === 'APPROVED' &&
      verificationStatus === 'APPROVED',
    blockingReason,
    approvalStatus: verificationStatus,
  }
}

/**
 * Full compliance check for chefs (terms + structured compliance + approval)
 */
export async function checkChefCompliance(userId: string): Promise<ComplianceCheckResult> {
  const [termsResult, complianceResult] = await Promise.all([
    checkTermsAcceptance(userId),
    checkChefOperationalCompliance(userId),
  ])

  const canProceed = termsResult.canProceed && complianceResult.canProceed

  let blockingReason: string | undefined
  if (!canProceed) {
    if (!termsResult.termsAccepted) {
      blockingReason = 'TERMS_NOT_ACCEPTED'
    } else if (!termsResult.termsCurrent) {
      blockingReason = 'TERMS_OUTDATED'
    } else {
      blockingReason = complianceResult.blockingReason
    }
  }

  return {
    termsAccepted: termsResult.termsAccepted,
    termsCurrent: termsResult.termsCurrent,
    complianceConfirmed: complianceResult.complianceConfirmed,
    canProceed,
    blockingReason,
    acceptedVia: termsResult.acceptedVia,
    approvalStatus: complianceResult.approvalStatus,
  }
}

/**
 * Enforce terms acceptance before action
 */
export async function enforceTermsAcceptance(userId: string): Promise<void> {
  const result = await checkTermsAcceptance(userId)

  if (!result.canProceed) {
    switch (result.blockingReason) {
      case 'USER_NOT_FOUND':
        throw new ApiError(404, 'User not found')
      case 'TERMS_NOT_ACCEPTED':
        throw new ApiError(
          403,
          'TERMS_ACCEPTANCE_REQUIRED'
        )
      case 'TERMS_OUTDATED':
        throw new ApiError(
          403,
          'TERMS_ACCEPTANCE_OUTDATED'
        )
      default:
        throw new ApiError(403, 'TERMS_ACCEPTANCE_REQUIRED')
    }
  }
}

/**
 * Enforce structured chef compliance before chef action
 */
export async function enforceChefOperationalCompliance(userId: string): Promise<void> {
  const result = await checkChefOperationalCompliance(userId)

  if (!result.canProceed) {
    switch (result.blockingReason) {
      case 'CHEF_PROFILE_NOT_FOUND':
        throw new ApiError(404, 'Chef profile not found')
      case 'RIGHT_TO_WORK_CONFIRMATION_REQUIRED':
      case 'FOOD_HYGIENE_CONFIRMATION_REQUIRED':
      case 'FOOD_HYGIENE_CERTIFICATE_REQUIRED':
      case 'FOOD_HYGIENE_CERTIFICATE_APPROVAL_PENDING':
        throw new ApiError(
          403,
          'LEGAL_COMPLIANCE_REQUIRED'
        )
      case 'CHEF_APPROVAL_REJECTED':
        throw new ApiError(403, 'CHEF_APPROVAL_REJECTED')
      case 'CHEF_APPROVAL_PENDING':
        throw new ApiError(403, 'CHEF_APPROVAL_PENDING')
      default:
        throw new ApiError(403, 'LEGAL_COMPLIANCE_REQUIRED')
    }
  }
}

/**
 * Enforce full chef compliance (terms + structured compliance + approval)
 */
export async function enforceChefCompliance(userId: string): Promise<void> {
  const result = await checkChefCompliance(userId)

  if (!result.canProceed) {
    switch (result.blockingReason) {
      case 'TERMS_NOT_ACCEPTED':
        throw new ApiError(
          403,
          'TERMS_ACCEPTANCE_REQUIRED'
        )
      case 'TERMS_OUTDATED':
        throw new ApiError(
          403,
          'TERMS_ACCEPTANCE_OUTDATED'
        )
      case 'RIGHT_TO_WORK_CONFIRMATION_REQUIRED':
      case 'FOOD_HYGIENE_CONFIRMATION_REQUIRED':
      case 'FOOD_HYGIENE_CERTIFICATE_REQUIRED':
      case 'FOOD_HYGIENE_CERTIFICATE_APPROVAL_PENDING':
        throw new ApiError(403, 'LEGAL_COMPLIANCE_REQUIRED')
      case 'CHEF_APPROVAL_REJECTED':
        throw new ApiError(403, 'CHEF_APPROVAL_REJECTED')
      case 'CHEF_APPROVAL_PENDING':
        throw new ApiError(403, 'CHEF_APPROVAL_PENDING')
      default:
        throw new ApiError(403, 'LEGAL_COMPLIANCE_REQUIRED')
    }
  }
}

/**
 * Enforce client compliance (terms only)
 */
export async function enforceClientCompliance(userId: string): Promise<void> {
  await enforceTermsAcceptance(userId)
}
