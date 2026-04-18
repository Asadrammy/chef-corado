import { getServerSession } from "next-auth"
import type { Session } from "next-auth"

import { authOptions } from "@/lib/auth"
import { Role } from "@/types"

export async function getRequiredSession(requiredRole?: Role | Role[]): Promise<Session> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED")
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowedRoles.includes(session.user.role as Role)) {
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
