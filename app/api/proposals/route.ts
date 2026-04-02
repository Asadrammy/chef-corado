import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { ProposalStatus, BookingStatus, Role } from "@/types"
import { applyRateLimit } from "@/lib/redis-rate-limiter"
import { SecurityUtils, secureSchemas, sanitizeError, securityHeaders } from "@/lib/security"
import {
  triggerProposalNotification,
  triggerProposalAcceptedNotification,
  triggerProposalRejectedNotification,
  triggerBookingCreatedNotification,
} from "@/lib/notifications"
import { sendEmail, emailTemplates } from "@/lib/email"

const proposalSchema = z.object({
  requestId: z.string().cuid().min(1, "Request ID is required"),
  price: secureSchemas.securePrice,
  message: secureSchemas.secureMessage,
}).strict() // No additional properties allowed

const proposalUpdateSchema = z.object({
  proposalId: z.string().cuid(),
  status: z.enum([ProposalStatus.ACCEPTED, ProposalStatus.REJECTED]),
})

export async function POST(request: Request) {
  // Apply production rate limiting
  const rateLimitResult = await applyRateLimit(request, 'proposals')
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== Role.CLIENT && session.user.role !== Role.CHEF) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }

  // Get chef profile
  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!chefProfile) {
    const response = NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }

  let body: z.infer<typeof proposalSchema>

  try {
    const json = await request.json()
    body = proposalSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const response = NextResponse.json({ 
        error: "Validation failed",
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      }, { status: 422 })
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }
    const response = NextResponse.json({ error: "Invalid request" }, { status: 400 })
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }

  try {
    const targetRequest = await prisma.request.findUnique({
      where: { id: body.requestId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
    if (!targetRequest) {
      const response = NextResponse.json({ error: "Request not found" }, { status: 404 })
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    const created = await prisma.proposal.create({
      data: {
        request: { connect: { id: body.requestId } },
        chef: { connect: { id: chefProfile.id } },
        price: body.price,
        message: body.message,
        status: "PENDING",
      },
    })

    // Send email notification to client
    await sendEmail({
      to: targetRequest.client.email || `${targetRequest.client.id}@example.com`,
      subject: `New Proposal Received for ${targetRequest.title}`,
      html: emailTemplates.newProposal(
        targetRequest.client.name,
        session.user.name || "Chef",
        body.price,
        targetRequest.title
      ),
    }).catch(error => {
      console.error('Failed to send proposal email to client:', targetRequest.client.email, error)
      // Don't fail the request if email fails
    })

    await triggerProposalNotification(targetRequest.clientId, session.user.name ?? "Chef")
    
    const response = NextResponse.json(created)
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response

  } catch (error: any) {
    console.error('Proposal creation error:', error)
    const response = NextResponse.json({ 
      error: sanitizeError(error)
    }, { status: 500 })
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  const userId = session.user.id

  // Get chef profile ID if user is a chef
  let chefProfileId: string | undefined;
  if (role === Role.CHEF) {
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId: userId },
    });
    chefProfileId = chefProfile?.id;
  }

  const proposals =
    role === Role.CHEF && chefProfileId
      ? await prisma.proposal.findMany({
          where: { chefId: chefProfileId },
          orderBy: { createdAt: "desc" },
          include: {
            request: true,
            chef: true,
          },
        })
      : await prisma.proposal.findMany({
          where: { request: { clientId: userId } },
          orderBy: { createdAt: "desc" },
          include: {
            request: true,
            chef: true,
          },
        })

  return NextResponse.json({ proposals })
}

export async function PATCH(request: Request) {
  // Apply production rate limiting for proposal acceptance
  const rateLimitResult = await applyRateLimit(request, 'proposals')
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== Role.CLIENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: z.infer<typeof proposalUpdateSchema>
  try {
    const json = await request.json()
    body = proposalUpdateSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const existing = await prisma.proposal.findUnique({
    where: { id: body.proposalId },
    include: {
      request: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
  }

  if (existing.request.clientId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (existing.status !== ProposalStatus.PENDING) {
    return NextResponse.json({ error: "Proposal already resolved" }, { status: 400 })
  }

  const clientName = existing.request.client?.name ?? "Client"

  if (body.status === ProposalStatus.ACCEPTED) {
    const updated = await prisma.$transaction(async (tx: any) => {
      const accepted = await tx.proposal.update({
        where: { id: body.proposalId },
        data: { status: ProposalStatus.ACCEPTED },
        include: { chef: true, request: true },
      })

      // Reject all other proposals for this request
      await tx.proposal.updateMany({
        where: {
          requestId: existing.requestId,
          id: { not: body.proposalId },
          status: ProposalStatus.PENDING,
        },
        data: { status: ProposalStatus.REJECTED },
      })

      // CRITICAL SECURITY FIX: DO NOT create booking here
      // Booking will ONLY be created after payment confirmation via webhook
      // This prevents fraud and ensures payment is actually received

      return accepted
    })

    // Send email notification to chef for proposal acceptance
    const chefUser = await prisma.user.findUnique({
      where: { id: updated.chef.userId },
      select: { email: true, name: true }
    })

    if (chefUser?.email) {
      await sendEmail({
        to: chefUser.email,
        subject: `Proposal Accepted! 🎉`,
        html: emailTemplates.proposalAccepted(
          chefUser.name,
          clientName,
          updated.request.title
        ),
      }).catch(error => console.error('Failed to send proposal acceptance email:', error))
    }

    await triggerProposalAcceptedNotification(updated.chefId, clientName)
    return NextResponse.json({ proposal: updated })
  }

  const updated = await prisma.proposal.update({
    where: { id: body.proposalId },
    data: { status: ProposalStatus.REJECTED },
    include: { chef: true, request: true },
  })

  await triggerProposalRejectedNotification(updated.chefId, clientName)
  return NextResponse.json({ proposal: updated })
}
