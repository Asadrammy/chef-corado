import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"

const serviceAssetSchema = z.object({
  id: z.string().optional(),
  serviceType: z.string().min(1).max(120),
  imageUrl: z.string().min(1).max(1000),
  altText: z.string().min(3).max(500),
  source: z.string().max(500).optional().nullable(),
  photographer: z.string().max(200).optional().nullable(),
  licence: z.string().max(200).optional().nullable(),
  licenceUrl: z.string().max(1000).optional().nullable(),
  suppliedByClient: z.boolean().optional(),
  clientApproved: z.boolean().optional(),
  usageLocations: z.string().max(1000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "REVIEW_REQUIRED", "ARCHIVED", "REJECTED"]).optional(),
  internalNotes: z.string().max(2000).optional().nullable(),
})

export async function GET() {
  try {
    await requireAdminPermission("serviceAssets.view")
    const assets = await prisma.serviceAsset.findMany({
      orderBy: [{ serviceType: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ assets })
  } catch (error) {
    return handleApiError(error, "Admin Service Assets GET")
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminPermission("serviceAssets.manage")
    const payload = serviceAssetSchema.parse(await request.json())
    const existing = payload.id ? await prisma.serviceAsset.findUnique({ where: { id: payload.id } }) : null

    const duplicate = await prisma.serviceAsset.findFirst({
      where: {
        id: existing ? { not: existing.id } : undefined,
        serviceType: payload.serviceType,
        imageUrl: payload.imageUrl,
        status: { not: "ARCHIVED" },
      },
      select: { id: true },
    })

    if (duplicate) {
      return NextResponse.json({ error: "A non-archived asset with this service type and image already exists." }, { status: 409 })
    }

    const asset = existing
      ? await prisma.serviceAsset.update({
          where: { id: existing.id },
          data: {
            serviceType: payload.serviceType,
            imageUrl: payload.imageUrl,
            altText: payload.altText,
            source: payload.source ?? null,
            photographer: payload.photographer ?? null,
            licence: payload.licence ?? null,
            licenceUrl: payload.licenceUrl ?? null,
            suppliedByClient: payload.suppliedByClient ?? false,
            clientApproved: payload.clientApproved ?? false,
            usageLocations: payload.usageLocations ?? null,
            status: payload.status ?? existing.status,
            internalNotes: payload.internalNotes ?? null,
            updatedBy: actor.userId,
          },
        })
      : await prisma.serviceAsset.create({
          data: {
            serviceType: payload.serviceType,
            imageUrl: payload.imageUrl,
            altText: payload.altText,
            source: payload.source ?? null,
            photographer: payload.photographer ?? null,
            licence: payload.licence ?? null,
            licenceUrl: payload.licenceUrl ?? null,
            suppliedByClient: payload.suppliedByClient ?? false,
            clientApproved: payload.clientApproved ?? false,
            usageLocations: payload.usageLocations ?? null,
            status: payload.status ?? "ACTIVE",
            internalNotes: payload.internalNotes ?? null,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        })

    await prisma.auditLog.create({
      data: {
        action: existing ? "SERVICE_ASSET_UPDATED" : "SERVICE_ASSET_CREATED",
        entityType: "ServiceAsset",
        entityId: asset.id,
        oldValue: existing ? JSON.stringify(existing) : null,
        newValue: JSON.stringify(asset),
        performedBy: actor.userId,
        reason: "Service asset governance change",
      },
    })

    return NextResponse.json({ asset })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return handleApiError(error, "Admin Service Assets POST")
  }
}
