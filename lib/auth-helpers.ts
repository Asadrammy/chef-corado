import { getServerSession } from "next-auth"
import type { Session } from "next-auth"

import { authOptions } from "@/lib/auth"
import { TERMS_VERSION } from "@/lib/request-options"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { Role } from "@/types"

export async function getRequiredSession(requiredRole?: Role | Role[]): Promise<Session> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED")
  }

  let currentUser

  try {
    currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isBanned: true,
        role: true,
        termsAcceptedAt: true,
        termsVersion: true,
        acceptedVia: true,
      },
    })
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      currentUser = {
        isBanned: false,
        role: session.user.role,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
        acceptedVia: "local-demo",
      }
    } else {
      throw error
    }
  }

  if (!currentUser) {
    throw new Error("UNAUTHORIZED")
  }

  if (currentUser.isBanned) {
    throw new Error("ACCOUNT_SUSPENDED")
  }

  const needsTermsAcceptance = !currentUser.termsAcceptedAt || currentUser.termsVersion !== TERMS_VERSION || !currentUser.acceptedVia

  session.user.needsTermsAcceptance = needsTermsAcceptance
  session.user.complianceStatus = null
  session.user.needsChefCompliance = currentUser.role === Role.CHEF
  session.user.insuranceStatus = null
  session.user.needsInsuranceVerification = currentUser.role === Role.CHEF

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
