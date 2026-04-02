import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { ProposalStatus, Role } from "@/types"

const proposalResolutionSchema = z.object({
  status: z.enum([ProposalStatus.ACCEPTED, ProposalStatus.REJECTED]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const { proposalId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== Role.CLIENT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!proposalId) {
    return NextResponse.json({ error: "Missing proposal" }, { status: 400 })
  }

  let payload: z.infer<typeof proposalResolutionSchema>
  try {
    const json = await request.json()
    payload = proposalResolutionSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  // Use transaction to prevent race conditions
  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Lock the proposal record for update
      const existing = await tx.proposal.findUnique({
        where: { id: proposalId },
        include: { request: true },
      })

      if (!existing) {
        throw new Error("Proposal not found")
      }

      if (existing.request.clientId !== session.user.id) {
        throw new Error("Unauthorized")
      }

      // CRITICAL: Check status within transaction to prevent race conditions
      if (existing.status !== ProposalStatus.PENDING) {
        throw new Error("Proposal already resolved")
      }

      // Check if booking already exists for this proposal
      const existingBooking = await tx.booking.findUnique({
        where: { proposalId: proposalId }
      })

      if (existingBooking) {
        throw new Error("Booking already exists for this proposal")
      }

      // Atomic update with condition
      const updatedProposal = await tx.proposal.update({
        where: { 
          id: proposalId,
          status: ProposalStatus.PENDING // Extra safety: only update if still pending
        },
        data: { status: payload.status },
        include: {
          chef: true,
          request: true,
        },
      })

      // If accepting, reject all other pending proposals for this request
      if (payload.status === ProposalStatus.ACCEPTED) {
        await tx.proposal.updateMany({
          where: {
            requestId: existing.requestId,
            id: { not: proposalId },
            status: ProposalStatus.PENDING,
          },
          data: { status: ProposalStatus.REJECTED },
        })
      }

      return updatedProposal
    })

    return NextResponse.json({ proposal: updated })
    
  } catch (error: any) {
    console.error('Proposal update error:', error)
    
    // Return appropriate error messages without exposing internal details
    if (error.message === "Proposal not found") {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message === "Proposal already resolved") {
      return NextResponse.json({ error: "Proposal already resolved" }, { status: 400 })
    }
    if (error.message === "Booking already exists for this proposal") {
      return NextResponse.json({ error: "Booking already exists" }, { status: 400 })
    }
    
    // Generic error for other cases
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 })
  }
}
