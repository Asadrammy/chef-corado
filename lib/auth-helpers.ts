import { getServerSession } from "next-auth"
import type { Session } from "next-auth"

import { authOptions, getLocalDemoSessionRecord, type SessionComplianceRecord } from "@/lib/auth"
import { TERMS_VERSION } from "@/lib/request-options"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function getRequiredSession(requiredRole?: Role | Role[]): Promise<Session> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED")
  }

  let currentUser: SessionComplianceRecord | null = getLocalDemoSessionRecord(session.user.id, session.user.email, session.user.role)

  if (!currentUser) {
    try {
      currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          isBanned: true,
          role: true,
          termsAcceptedAt: true,
          termsVersion: true,
          acceptedVia: true,
          chefProfile: {
            select: {
              rightToWorkUkConfirmed: true,
              foodHygieneLevel2Confirmed: true,
              foodHygieneCertificateUrl: true,
              foodHygieneCertificateReviewStatus: true,
              verificationStatus: true,
              isApproved: true,
              isBanned: true,
            },
          },
        },
      })
    } catch (error) {
      if (isPrismaConnectionError(error)) {
        currentUser = getLocalDemoSessionRecord(session.user.id, session.user.email, session.user.role)
      } else {
        throw error
      }
    }
  }

  if (!currentUser) {
    throw new Error("UNAUTHORIZED")
  }

  if (currentUser.isBanned) {
    throw new Error("ACCOUNT_SUSPENDED")
  }

  const needsTermsAcceptance = !currentUser.termsAcceptedAt || currentUser.termsVersion !== TERMS_VERSION || !currentUser.acceptedVia
  const chefProfile = currentUser.chefProfile

  session.user.needsTermsAcceptance = needsTermsAcceptance
  session.user.complianceStatus = null
  session.user.needsChefCompliance = currentUser.role === Role.CHEF
    ? !chefProfile ||
      chefProfile.isBanned ||
      !chefProfile.rightToWorkUkConfirmed ||
      !chefProfile.foodHygieneLevel2Confirmed ||
      !chefProfile.foodHygieneCertificateUrl ||
      chefProfile.foodHygieneCertificateReviewStatus !== "APPROVED" ||
      chefProfile.verificationStatus !== "APPROVED" ||
      !chefProfile.isApproved
    : false
  session.user.insuranceStatus = null
  session.user.needsInsuranceVerification = false

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowedRoles.includes(currentUser.role as Role)) {
      throw new Error("FORBIDDEN")
    }
  }

  return session
}

export function getSessionUserId(session: Session): string {
  if (!session.user.id) {
    throw new Error("UNAUTHORIZED")
  }

  return session.user.id
}
