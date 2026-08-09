import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  adminHasPermission,
  getAdminRolePermissions,
  isAdminStaffRole,
  type AdminPermission,
  type AdminStaffRole,
} from "@/lib/admin-permissions"

export type AdminAccessContext = {
  userId: string
  email: string | null
  name: string | null
  adminRole: AdminStaffRole
  permissions: AdminPermission[]
}

type AdminUserRecord = {
  id: string
  name: string
  email: string
  role: string
  adminRole: string | null
  adminPermissions: string | null
  adminDisabledAt: Date | null
  isBanned: boolean
}

function localDemoAdminRecord(userId: string, email?: string | null): AdminUserRecord | null {
  if (process.env.NODE_ENV !== "development") return null
  if (userId !== "local-demo-admin-user" && email?.toLowerCase() !== "admin@example.com") return null

  return {
    id: "local-demo-admin-user",
    name: "Sarah Mitchell",
    email: "admin@example.com",
    role: "ADMIN",
    adminRole: "SUPER_ADMIN",
    adminPermissions: null,
    adminDisabledAt: null,
    isBanned: false,
  }
}

export async function getAdminAccessContext(requiredPermission?: AdminPermission): Promise<AdminAccessContext> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED")
  }

  const user = localDemoAdminRecord(session.user.id, session.user.email) ?? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      adminRole: true,
      adminPermissions: true,
      adminDisabledAt: true,
      isBanned: true,
    },
  })

  if (!user || user.role !== "ADMIN" || user.isBanned || user.adminDisabledAt) {
    throw new Error("FORBIDDEN")
  }

  const adminRole = isAdminStaffRole(user.adminRole) ? user.adminRole : "SUPER_ADMIN"
  const permissions = getAdminRolePermissions(adminRole, user.adminPermissions)

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    throw new Error("FORBIDDEN")
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    adminRole,
    permissions,
  }
}

export async function requireAdminPermission(permission: AdminPermission) {
  return getAdminAccessContext(permission)
}

export async function requireAdminPagePermission(permission: AdminPermission) {
  try {
    return await getAdminAccessContext(permission)
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN"
    redirect(message === "UNAUTHORIZED" ? "/login?role=ADMIN" : "/dashboard")
  }
}

export async function requireAdminPageAccess() {
  try {
    return await getAdminAccessContext()
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN"
    redirect(message === "UNAUTHORIZED" ? "/login?role=ADMIN" : "/dashboard")
  }
}

export function adminApiError(error: unknown, context = "Admin authorization") {
  const message = error instanceof Error ? error.message : String(error)
  if (message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (message === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  console.error(context, error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

export async function assertAdminPermission(userId: string, permission: AdminPermission) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      adminRole: true,
      adminPermissions: true,
      adminDisabledAt: true,
      isBanned: true,
    },
  })

  if (!user || user.role !== "ADMIN" || user.isBanned || user.adminDisabledAt) {
    throw new Error("FORBIDDEN")
  }

  if (!adminHasPermission(user.adminRole, permission, user.adminPermissions)) {
    throw new Error("FORBIDDEN")
  }
}

export function maskEmail(email?: string | null) {
  if (!email) return null
  const [name, domain] = email.split("@")
  if (!name || !domain) return "masked"
  return `${name.slice(0, 2)}***@${domain}`
}
