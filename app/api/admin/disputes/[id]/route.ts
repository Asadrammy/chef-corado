import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"

const disputeActionSchema = z.object({
  status: z.enum(["OPEN", "UNDER_REVIEW", "WAITING_ON_CUSTOMER", "PROPOSED_RESOLUTION", "RESOLVED", "CLOSED"]).optional(),
  assignedTo: z.string().optional().nullable(),
  investigationState: z.string().max(120).optional().nullable(),
  internalNotes: z.string().max(3000).optional().nullable(),
  resolution: z.string().max(3000).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminPermission("disputes.resolve")
    const { id } = await context.params
    const payload = disputeActionSchema.parse(await request.json())
    const existing = await prisma.dispute.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.update({
        where: { id },
        data: {
          status: payload.status ?? existing.status,
          assignedTo: payload.assignedTo === undefined ? existing.assignedTo : payload.assignedTo,
          investigationState: payload.investigationState === undefined ? existing.investigationState : payload.investigationState,
          internalNotes: payload.internalNotes === undefined ? existing.internalNotes : payload.internalNotes,
          resolution: payload.resolution === undefined ? existing.resolution : payload.resolution,
          resolvedBy: payload.status === "RESOLVED" ? actor.userId : existing.resolvedBy,
          resolvedAt: payload.status === "RESOLVED" ? new Date() : existing.resolvedAt,
        },
      })

      await tx.auditLog.create({
        data: {
          action: "DISPUTE_UPDATED",
          entityType: "Dispute",
          entityId: id,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(dispute),
          performedBy: actor.userId,
          reason: payload.resolution ?? payload.internalNotes ?? "Dispute workflow updated",
        },
      })

      return dispute
    })

    return NextResponse.json({ dispute: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return handleApiError(error, "Admin Dispute PATCH")
  }
}
