import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { prisma } from "@/lib/prisma"

const createTicketSchema = z.object({
  category: z.string().min(2).max(120),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  subject: z.string().min(3).max(200),
  description: z.string().min(5).max(3000),
  relatedRequestId: z.string().optional().nullable(),
  relatedBookingId: z.string().optional().nullable(),
  relatedPaymentId: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const session = await getRequiredSession()

    const tickets = await prisma.supportTicket.findMany({
      where: { requesterId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          where: { internal: false },
          orderBy: { createdAt: "asc" },
          take: 20,
        },
      },
      take: 50,
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    return handleApiError(error, "Support Tickets GET")
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession()
    const payload = createTicketSchema.parse(await request.json())

    const ticket = await prisma.$transaction(async (tx) => {
      const createdTicket = await tx.supportTicket.create({
        data: {
          requesterId: session.user.id,
          requesterRole: session.user.role,
          requesterEmail: session.user.email,
          category: payload.category,
          priority: payload.priority,
          subject: payload.subject,
          description: payload.description,
          relatedRequestId: payload.relatedRequestId ?? null,
          relatedBookingId: payload.relatedBookingId ?? null,
          relatedPaymentId: payload.relatedPaymentId ?? null,
          messages: {
            create: {
              senderId: session.user.id,
              senderRole: session.user.role,
              message: payload.description,
              internal: false,
            },
          },
        },
        include: { messages: true },
      })

      const admins = await tx.user.findMany({
        where: { role: "ADMIN", adminDisabledAt: null, isBanned: false },
        select: { id: true },
        take: 25,
      })

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "SUPPORT_TICKET_CREATED",
            message: `New ${createdTicket.priority.toLowerCase()} support ticket: ${createdTicket.subject}`,
          })),
        })
      }

      return createdTicket
    })

    await prisma.auditLog.create({
      data: {
        action: "SUPPORT_TICKET_CREATED",
        entityType: "SupportTicket",
        entityId: ticket.id,
        oldValue: null,
        newValue: JSON.stringify({ category: ticket.category, priority: ticket.priority, status: ticket.status }),
        performedBy: session.user.id,
        reason: "Help/support escalation created",
      },
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return handleApiError(error, "Support Tickets POST")
  }
}
