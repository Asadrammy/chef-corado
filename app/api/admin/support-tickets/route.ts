import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"

const updateTicketSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedTo: z.string().optional().nullable(),
  resolution: z.string().max(2000).optional().nullable(),
  message: z.string().max(3000).optional(),
  internal: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("supportTickets.view")
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const tickets = await prisma.supportTicket.findMany({
      where: status && status !== "all" ? { status } : undefined,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 20,
        },
      },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    return handleApiError(error, "Admin Support Tickets GET")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = updateTicketSchema.parse(await request.json())
    const actor = payload.assignedTo ? await requireAdminPermission("supportTickets.assign") : await requireAdminPermission("supportTickets.resolve")
    const existing = await prisma.supportTicket.findUnique({ where: { id: payload.ticketId } })

    if (!existing) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.update({
        where: { id: payload.ticketId },
        data: {
          status: payload.status ?? existing.status,
          priority: payload.priority ?? existing.priority,
          assignedTo: payload.assignedTo === undefined ? existing.assignedTo : payload.assignedTo,
          resolution: payload.resolution === undefined ? existing.resolution : payload.resolution,
          resolvedAt: payload.status === "RESOLVED" || payload.status === "CLOSED" ? new Date() : existing.resolvedAt,
        },
      })

      if (payload.message) {
        await tx.supportTicketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: actor.userId,
            senderRole: actor.adminRole,
            message: payload.message,
            internal: payload.internal ?? false,
          },
        })
      }

      if (existing.requesterId && (!payload.internal || payload.status || payload.resolution)) {
        await tx.notification.create({
          data: {
            userId: existing.requesterId,
            type: "SUPPORT_TICKET_UPDATED",
            message: `Support ticket "${ticket.subject}" was updated.`,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          action: "SUPPORT_TICKET_UPDATED",
          entityType: "SupportTicket",
          entityId: ticket.id,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(ticket),
          performedBy: actor.userId,
          reason: payload.resolution ?? "Support ticket updated",
        },
      })

      return ticket
    })

    return NextResponse.json({ ticket: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return handleApiError(error, "Admin Support Tickets PATCH")
  }
}
