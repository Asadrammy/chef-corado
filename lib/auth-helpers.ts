import { getServerSession } from "next-auth"
import type { Session } from "next-auth"

import { authOptions } from "@/lib/auth"
import { INSURANCE_VERSION, TERMS_VERSION } from "@/lib/request-options"
import { prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function getRequiredSession(requiredRole?: Role | Role[]): Promise<Session> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED")
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isBanned: true,
      role: true,
      termsAcceptedAt: true,
      termsVersion: true,
      acceptedVia: true,
      chefProfile: {
        select: {
          insuranceStatus: true,
          insuranceDocumentUrl: true,
          insuranceVerifiedAt: true,
          insuranceExpiryDate: true,
        },
      },
    },
  })

  if (!currentUser) {
    throw new Error("UNAUTHORIZED")
  }

  if (currentUser.isBanned) {
    throw new Error("ACCOUNT_SUSPENDED")
  }

  const needsTermsAcceptance = !currentUser.termsAcceptedAt || currentUser.termsVersion !== TERMS_VERSION || !currentUser.acceptedVia
  const insuranceExpired = currentUser.chefProfile?.insuranceExpiryDate
    ? currentUser.chefProfile.insuranceExpiryDate.getTime() < Date.now()
    : false
  const needsInsuranceVerification = currentUser.role === Role.CHEF
    ? currentUser.chefProfile?.insuranceStatus !== "verified"
      || !currentUser.chefProfile?.insuranceDocumentUrl
      || !currentUser.chefProfile?.insuranceVerifiedAt
      || insuranceExpired
    : false

  session.user.needsTermsAcceptance = needsTermsAcceptance
  session.user.insuranceStatus = currentUser.chefProfile?.insuranceStatus ?? null
  session.user.needsInsuranceVerification = needsInsuranceVerification

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
