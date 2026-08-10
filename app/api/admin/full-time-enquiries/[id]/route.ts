import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"

const fullTimeActionSchema = z.object({
  status: z.enum(["NEW", "QUALIFYING", "MATCHING", "INTRODUCED", "IN_PROGRESS", "PLACED", "CLOSED"]).optional(),
  assignedTo: z.string().optional().nullable(),
  internalNotes: z.string().max(3000).optional().nullable(),
  closedReason: z.string().max(1000).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminPermission("fullTimeEnquiries.resolve")
    const { id } = await context.params
    const payload = fullTimeActionSchema.parse(await request.json())
    const existing = await prisma.fullTimeChefEnquiry.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: "Full-time enquiry not found" }, { status: 404 })
    }

    const terminal = payload.status === "PLACED" || payload.status === "CLOSED"
    const updated = await prisma.$transaction(async (tx) => {
      const enquiry = await tx.fullTimeChefEnquiry.update({
        where: { id },
        data: {
          status: payload.status ?? existing.status,
          assignedTo: payload.assignedTo === undefined ? existing.assignedTo : payload.assignedTo,
          internalNotes: payload.internalNotes === undefined ? existing.internalNotes : payload.internalNotes,
          qualifiedAt: payload.status === "QUALIFYING" && !existing.qualifiedAt ? new Date() : existing.qualifiedAt,
          closedAt: terminal ? new Date() : existing.closedAt,
          closedReason: payload.closedReason === undefined ? existing.closedReason : payload.closedReason,
        },
      })

      await tx.auditLog.create({
        data: {
          action: "FULL_TIME_ENQUIRY_UPDATED",
          entityType: "FullTimeChefEnquiry",
          entityId: id,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(enquiry),
          performedBy: actor.userId,
          reason: payload.internalNotes ?? payload.closedReason ?? "Full-time placement workflow updated",
        },
      })

      if (payload.status && payload.status !== existing.status) {
        await tx.notification.create({
          data: {
            userId: existing.clientId,
            type: "FULL_TIME_ENQUIRY_UPDATED",
            message: `Your full-time chef enquiry moved to ${payload.status.replace(/_/g, " ")}.`,
          },
        })
      }

      return enquiry
    })

    return NextResponse.json({ enquiry: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return handleApiError(error, "Admin Full-Time Enquiry PATCH")
  }
}
