import { NextResponse } from "next/server"
import { z } from "zod"

import { apiError } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { proposalService } from "@/lib/services/proposal-service"
import { ProposalStatus, Role } from "@/types"
import { applyRateLimit } from "@/lib/redis-rate-limiter"
import { secureSchemas, securityHeaders } from "@/lib/security"
import { isPrismaConnectionError } from "@/lib/prisma"

const proposalSchema = z.object({
  requestId: z.string().cuid().min(1, "Request ID is required"),
  price: secureSchemas.securePrice,
  message: secureSchemas.secureMessage,
  menuId: z.string().cuid().optional().nullable(),
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

  let session
  try {
    session = await getRequiredSession(Role.CHEF)
  } catch {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
    const created = await proposalService.createProposal(
      getSessionUserId(session),
      session.user.name,
      body
    )
    
    const response = NextResponse.json(created)
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response

  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      const response = NextResponse.json(
        { error: "Proposals are unavailable in local demo mode" },
        { status: 503 }
      )
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && error.message === "CHEF_PROFILE_NOT_FOUND") {
      const response = NextResponse.json({ error: "Chef profile not found" }, { status: 404 })
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && error.message === "REQUEST_NOT_FOUND") {
      const response = NextResponse.json({ error: "Request not found" }, { status: 404 })
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && error.message === "REQUEST_PROPOSAL_LIMIT_REACHED") {
      const response = NextResponse.json(
        { error: "This request has already received the maximum of 10 quotes." },
        { status: 409 }
      )
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && error.message === "MENU_NOT_FOUND_OR_FORBIDDEN") {
      const response = NextResponse.json(
        { error: "Selected menu was not found for your chef profile." },
        { status: 403 }
      )
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    const response = handleApiError(error, "Proposals POST")
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }
}

export async function GET() {
  let session
  try {
    session = await getRequiredSession()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let proposals

  try {
    proposals = await proposalService.listProposals(
      getSessionUserId(session),
      session.user.role
    )
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json({ proposals: [], localDemo: true })
    }

    throw error
  }

  return NextResponse.json({ proposals })
}

export async function PATCH(request: Request) {
  // Apply production rate limiting for proposal acceptance
  const rateLimitResult = await applyRateLimit(request, 'proposals')
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response
  }

  let session
  try {
    session = await getRequiredSession(Role.CLIENT)
  } catch {
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

  try {
    const updated = await proposalService.resolveProposal(
      getSessionUserId(session),
      body.proposalId,
      body.status
    )

    return NextResponse.json({ proposal: updated })
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: "Proposals are unavailable in local demo mode" },
        { status: 503 }
      )
    }

    if (error instanceof Error && error.message === "PROPOSAL_NOT_FOUND") {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
    }

    if (error instanceof Error && error.message === "PROPOSAL_ALREADY_RESOLVED") {
      return NextResponse.json({ error: "Proposal already resolved" }, { status: 400 })
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return handleApiError(error, "Proposals PATCH")
  }
}
