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

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession()
    const payload = createTicketSchema.parse(await request.json())

    const ticket = await prisma.supportTicket.create({
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
      },
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
