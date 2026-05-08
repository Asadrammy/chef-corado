/**
 * Legal Compliance Guard
 * 
 * Enforces terms acceptance and insurance verification requirements
 * before allowing critical business actions.
 */

import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/error-handler'
import { TERMS_VERSION } from '@/lib/request-options'

export type ComplianceCheckResult = {
  termsAccepted: boolean
  termsCurrent: boolean
  insuranceVerified: boolean
  canProceed: boolean
  blockingReason?: string
  acceptedVia?: string | null
  insuranceStatus?: string | null
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
      insuranceVerified: false,
      canProceed: false,
      blockingReason: 'USER_NOT_FOUND',
    }
  }

  const termsAccepted = !!user.termsAcceptedAt
  const termsCurrent = user.termsVersion === TERMS_VERSION && !!(user as any).acceptedVia

  return {
    termsAccepted,
    termsCurrent,
    insuranceVerified: false,
    canProceed: termsAccepted && termsCurrent,
    blockingReason: !termsAccepted ? 'TERMS_NOT_ACCEPTED' : !termsCurrent ? 'TERMS_OUTDATED' : undefined,
    acceptedVia: (user as any).acceptedVia,
  }
}

/**
 * Check if chef has verified insurance on file
 */
export async function checkInsuranceAcknowledgement(userId: string): Promise<ComplianceCheckResult> {
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId },
    select: {
      insuranceStatus: true,
      insuranceDocumentUrl: true,
      insuranceExpiryDate: true,
      insuranceVerifiedAt: true,
    },
  })

  if (!chefProfile) {
    return {
      termsAccepted: false,
      termsCurrent: false,
      insuranceVerified: false,
      canProceed: false,
      blockingReason: 'CHEF_PROFILE_NOT_FOUND',
    }
  }

  const insuranceExpired = chefProfile.insuranceExpiryDate ? chefProfile.insuranceExpiryDate.getTime() < Date.now() : false
  const insuranceVerified = chefProfile.insuranceStatus === 'verified' && !!chefProfile.insuranceDocumentUrl && !!chefProfile.insuranceVerifiedAt && !insuranceExpired
  let blockingReason: string | undefined

  if (!chefProfile.insuranceDocumentUrl) {
    blockingReason = 'INSURANCE_DOCUMENT_MISSING'
  } else if (chefProfile.insuranceStatus === 'rejected') {
    blockingReason = 'INSURANCE_REJECTED'
  } else if (insuranceExpired) {
    blockingReason = 'INSURANCE_EXPIRED'
  } else if (!insuranceVerified) {
    blockingReason = 'INSURANCE_NOT_VERIFIED'
  }

  return {
    termsAccepted: false,
    termsCurrent: false,
    insuranceVerified,
    canProceed: insuranceVerified,
    blockingReason,
    insuranceStatus: chefProfile.insuranceStatus,
  }
}

/**
 * Full compliance check for chefs (terms + insurance)
 */
export async function checkChefCompliance(userId: string): Promise<ComplianceCheckResult> {
  const [termsResult, insuranceResult] = await Promise.all([
    checkTermsAcceptance(userId),
    checkInsuranceAcknowledgement(userId),
  ])

  const canProceed = termsResult.canProceed && insuranceResult.canProceed

  let blockingReason: string | undefined
  if (!canProceed) {
    if (!termsResult.termsAccepted) {
      blockingReason = 'TERMS_NOT_ACCEPTED'
    } else if (!termsResult.termsCurrent) {
      blockingReason = 'TERMS_OUTDATED'
    } else {
      blockingReason = insuranceResult.blockingReason
    }
  }

  return {
    termsAccepted: termsResult.termsAccepted,
    termsCurrent: termsResult.termsCurrent,
    insuranceVerified: insuranceResult.insuranceVerified,
    canProceed,
    blockingReason,
    acceptedVia: termsResult.acceptedVia,
    insuranceStatus: insuranceResult.insuranceStatus,
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
 * Enforce insurance verification before chef action
 */
export async function enforceInsuranceAcknowledgement(userId: string): Promise<void> {
  const result = await checkInsuranceAcknowledgement(userId)

  if (!result.canProceed) {
    switch (result.blockingReason) {
      case 'CHEF_PROFILE_NOT_FOUND':
        throw new ApiError(404, 'Chef profile not found')
      case 'INSURANCE_DOCUMENT_MISSING':
        throw new ApiError(
          403,
          'INSURANCE_DOCUMENT_REQUIRED'
        )
      case 'INSURANCE_NOT_VERIFIED':
        throw new ApiError(
          403,
          'INSURANCE_VERIFICATION_REQUIRED'
        )
      case 'INSURANCE_REJECTED':
        throw new ApiError(403, 'INSURANCE_REJECTED')
      case 'INSURANCE_EXPIRED':
        throw new ApiError(403, 'INSURANCE_EXPIRED')
      default:
        throw new ApiError(403, 'INSURANCE_VERIFICATION_REQUIRED')
    }
  }
}

/**
 * Enforce full chef compliance (terms + insurance)
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
      case 'INSURANCE_DOCUMENT_MISSING':
        throw new ApiError(
          403,
          'INSURANCE_DOCUMENT_REQUIRED'
        )
      case 'INSURANCE_NOT_VERIFIED':
        throw new ApiError(
          403,
          'INSURANCE_VERIFICATION_REQUIRED'
        )
      case 'INSURANCE_REJECTED':
        throw new ApiError(403, 'INSURANCE_REJECTED')
      case 'INSURANCE_EXPIRED':
        throw new ApiError(403, 'INSURANCE_EXPIRED')
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
