import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"

const createBackgroundCheckSchema = z.object({
  chefId: z.string().min(1),
  checkType: z.string().min(2).max(120),
  provider: z.string().max(200).optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  status: z.enum(["NOT_STARTED", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"]).default("PENDING"),
  submittedAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  recheckAt: z.string().datetime().optional().nullable(),
  internalNotes: z.string().max(3000).optional().nullable(),
})

const updateBackgroundCheckSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NOT_STARTED", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"]).optional(),
  provider: z.string().max(200).optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  recheckAt: z.string().datetime().optional().nullable(),
  internalNotes: z.string().max(3000).optional().nullable(),
})

function getBackgroundCheckModel() {
  return (prisma as unknown as {
    backgroundCheck?: typeof prisma.backgroundCheck
  }).backgroundCheck
}

function backgroundChecksUnavailable() {
  return NextResponse.json(
    { error: "Background check storage is not available. Apply the admin workspace hardening migration, regenerate Prisma Client, and restart the server." },
    { status: 503 }
  )
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("backgroundChecks.view")
    const backgroundCheck = getBackgroundCheckModel()
    if (!backgroundCheck) return backgroundChecksUnavailable()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const checks = await backgroundCheck.findMany({
      where: status && status !== "all" ? { status } : undefined,
      include: {
        chef: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
    })

    return NextResponse.json({ checks })
  } catch (error) {
    return handleApiError(error, "Admin Background Checks GET")
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminPermission("certificates.review")
    const backgroundCheck = getBackgroundCheckModel()
    if (!backgroundCheck) return backgroundChecksUnavailable()

    const payload = createBackgroundCheckSchema.parse(await request.json())
    const chef = await prisma.chefProfile.findUnique({ where: { id: payload.chefId }, select: { id: true } })

    if (!chef) {
      return NextResponse.json({ error: "Chef profile not found." }, { status: 404 })
    }

    const check = await prisma.$transaction(async (tx) => {
      const created = await tx.backgroundCheck.create({
        data: {
          chefId: payload.chefId,
          checkType: payload.checkType,
          provider: payload.provider ?? null,
          reference: payload.reference ?? null,
          status: payload.status,
          submittedAt: payload.submittedAt ? new Date(payload.submittedAt) : null,
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
          recheckAt: payload.recheckAt ? new Date(payload.recheckAt) : null,
          internalNotes: payload.internalNotes ?? null,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      })

      await tx.auditLog.create({
        data: {
          action: "BACKGROUND_CHECK_CREATED",
          entityType: "BackgroundCheck",
          entityId: created.id,
          oldValue: null,
          newValue: JSON.stringify(created),
          performedBy: actor.userId,
          reason: "Background check record created",
        },
      })

      return created
    })

    return NextResponse.json({ check }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return handleApiError(error, "Admin Background Checks POST")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdminPermission("certificates.review")
    const backgroundCheck = getBackgroundCheckModel()
    if (!backgroundCheck) return backgroundChecksUnavailable()

    const payload = updateBackgroundCheckSchema.parse(await request.json())
    const existing = await backgroundCheck.findUnique({ where: { id: payload.id } })

    if (!existing) {
      return NextResponse.json({ error: "Background check not found." }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const check = await tx.backgroundCheck.update({
        where: { id: payload.id },
        data: {
          status: payload.status ?? existing.status,
          provider: payload.provider === undefined ? existing.provider : payload.provider,
          reference: payload.reference === undefined ? existing.reference : payload.reference,
          expiresAt: payload.expiresAt === undefined ? existing.expiresAt : payload.expiresAt ? new Date(payload.expiresAt) : null,
          recheckAt: payload.recheckAt === undefined ? existing.recheckAt : payload.recheckAt ? new Date(payload.recheckAt) : null,
          internalNotes: payload.internalNotes === undefined ? existing.internalNotes : payload.internalNotes,
          reviewerId: payload.status && ["APPROVED", "REJECTED", "EXPIRED"].includes(payload.status) ? actor.userId : existing.reviewerId,
          reviewedAt: payload.status && ["APPROVED", "REJECTED", "EXPIRED"].includes(payload.status) ? new Date() : existing.reviewedAt,
          requestedUpdateAt: payload.status === "PENDING" ? new Date() : existing.requestedUpdateAt,
          updatedBy: actor.userId,
        },
      })

      await tx.auditLog.create({
        data: {
          action: "BACKGROUND_CHECK_UPDATED",
          entityType: "BackgroundCheck",
          entityId: check.id,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(check),
          performedBy: actor.userId,
          reason: payload.internalNotes ?? `Background check moved to ${check.status}`,
        },
      })

      return check
    })

    return NextResponse.json({ check: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return handleApiError(error, "Admin Background Checks PATCH")
  }
}
