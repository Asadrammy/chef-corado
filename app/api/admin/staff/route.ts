import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcrypt"
import { randomBytes } from "crypto"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { ADMIN_PERMISSIONS, ADMIN_STAFF_ROLES, isAdminStaffRole } from "@/lib/admin-permissions"
import { handleApiError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"
import { hashPasswordResetToken } from "@/lib/password-reset"
import { getConfiguredAppBaseUrl } from "@/lib/site-config"

const createStaffSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  adminRole: z.enum(ADMIN_STAFF_ROLES),
})

const updateStaffSchema = z.object({
  userId: z.string().min(1),
  adminRole: z.enum(ADMIN_STAFF_ROLES).optional(),
  adminPermissions: z.array(z.enum(ADMIN_PERMISSIONS)).optional(),
  disabled: z.boolean().optional(),
  reason: z.string().max(500).optional(),
})

function requireSuperAdminActor(actor: { adminRole: string }) {
  if (actor.adminRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can manage admin staff privileges." }, { status: 403 })
  }
  return null
}

export async function GET() {
  try {
    await requireAdminPermission("admins.edit")
    const staff = await prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: [{ adminRole: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        adminRole: true,
        adminPermissions: true,
        adminDisabledAt: true,
        adminLastPermissionChangeAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ staff })
  } catch (error) {
    return handleApiError(error, "Admin Staff GET")
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminPermission("admins.create")
    const superAdminError = requireSuperAdminActor(actor)
    if (superAdminError) return superAdminError

    const payload = createStaffSchema.parse(await request.json())
    const existing = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() }, select: { id: true } })

    if (existing) {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 })
    }

    const resetToken = randomBytes(32).toString("hex")
    const resetTokenHash = hashPasswordResetToken(resetToken)
    const resetTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24)
    const placeholderPassword = randomBytes(48).toString("hex")

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        password: await hash(placeholderPassword, 12),
        role: "ADMIN",
        adminRole: payload.adminRole,
        adminLastPermissionChangeAt: new Date(),
        resetToken: resetTokenHash,
        resetTokenExpires,
        verified: true,
      },
      select: { id: true, name: true, email: true, adminRole: true, createdAt: true, resetToken: true },
    })

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_CREATED",
        entityType: "User",
        entityId: user.id,
        oldValue: null,
        newValue: JSON.stringify({ email: user.email, adminRole: user.adminRole }),
        performedBy: actor.userId,
        reason: "Admin staff account created",
      },
    })

    const baseUrl = getConfiguredAppBaseUrl()
    const inviteUrl = `${baseUrl}/reset-password?token=${resetToken}`

    return NextResponse.json({ user, inviteUrl }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return handleApiError(error, "Admin Staff POST")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdminPermission("admins.edit")
    const superAdminError = requireSuperAdminActor(actor)
    if (superAdminError) return superAdminError

    const payload = updateStaffSchema.parse(await request.json())
    const existing = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, adminRole: true, adminPermissions: true, adminDisabledAt: true },
    })

    if (!existing || existing.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin staff account not found." }, { status: 404 })
    }

    if (payload.userId === actor.userId && payload.disabled) {
      return NextResponse.json({ error: "You cannot disable your own admin account." }, { status: 422 })
    }

    if (payload.adminRole && !isAdminStaffRole(payload.adminRole)) {
      return NextResponse.json({ error: "Invalid admin role." }, { status: 422 })
    }

    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        adminRole: payload.adminRole ?? existing.adminRole,
        adminPermissions: payload.adminPermissions ? JSON.stringify(payload.adminPermissions) : existing.adminPermissions,
        adminDisabledAt: payload.disabled === undefined ? existing.adminDisabledAt : payload.disabled ? new Date() : null,
        adminLastPermissionChangeAt: new Date(),
      },
      select: { id: true, name: true, email: true, adminRole: true, adminPermissions: true, adminDisabledAt: true },
    })

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_PERMISSION_CHANGED",
        entityType: "User",
        entityId: updated.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
        performedBy: actor.userId,
        reason: payload.reason ?? "Admin staff permissions updated",
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return handleApiError(error, "Admin Staff PATCH")
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireAdminPermission("admins.delete")
    const superAdminError = requireSuperAdminActor(actor)
    if (superAdminError) return superAdminError

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 })
    }

    if (userId === actor.userId) {
      return NextResponse.json({ error: "You cannot disable your own admin account." }, { status: 422 })
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, adminRole: true, adminDisabledAt: true },
    })

    if (!existing || existing.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin staff account not found." }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        adminDisabledAt: new Date(),
        adminLastPermissionChangeAt: new Date(),
      },
      select: { id: true, email: true, adminRole: true, adminDisabledAt: true },
    })

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_DISABLED",
        entityType: "User",
        entityId: updated.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
        performedBy: actor.userId,
        reason: "Admin staff account disabled instead of hard-deleted",
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    return handleApiError(error, "Admin Staff DELETE")
  }
}
