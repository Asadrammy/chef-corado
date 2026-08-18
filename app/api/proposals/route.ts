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
  lineItems: z.array(z.object({
    serviceDate: z.string().refine((date) => !Number.isNaN(Date.parse(date)), "Invalid service date").optional(),
    title: z.string().min(1).max(140),
    description: z.string().max(1000).optional(),
    price: secureSchemas.securePrice,
  })).max(30).optional(),
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

    if (error instanceof Error && error.message.startsWith("MARKET_BOOKING_INACTIVE:")) {
      const response = NextResponse.json(
        { error: "ChefaChef is preparing to launch bookings in this market. Proposals are not available yet." },
        { status: 403 }
      )
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

    if (error instanceof Error && error.message === "MULTI_DAY_PROPOSAL_LINE_ITEMS_REQUIRED") {
      const response = NextResponse.json(
        { error: "Multi-Day proposals must include one daily line item for each service date." },
        { status: 422 }
      )
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && error.message === "MULTI_DAY_PROPOSAL_LINE_ITEMS_MISMATCH") {
      const response = NextResponse.json(
        { error: "Multi-Day proposal line items must match the request service dates." },
        { status: 422 }
      )
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && error.message === "MULTI_DAY_PROPOSAL_TOTAL_MISMATCH") {
      const response = NextResponse.json(
        { error: "Multi-Day proposal total must equal the sum of daily line items." },
        { status: 422 }
      )
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && error.message.startsWith("PROPOSAL_BELOW_MINIMUM_SPEND:")) {
      const minimumSpend = error.message.split(":")[1]
      const response = NextResponse.json(
        { error: `Proposal price is below the active minimum spend (${minimumSpend}).` },
        { status: 422 }
      )
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && error.message.startsWith("PRICING_GUEST_COUNT_BELOW_MIN:")) {
      const minimumGuests = error.message.split(":")[1]
      const response = NextResponse.json(
        { error: `This request is below the active pricing guest minimum (${minimumGuests}).` },
        { status: 422 }
      )
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && error.message.startsWith("PRICING_GUEST_COUNT_ABOVE_MAX:")) {
      const maximumGuests = error.message.split(":")[1]
      const response = NextResponse.json(
        { error: `This request exceeds the active pricing guest maximum (${maximumGuests}).` },
        { status: 422 }
      )
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    if (error instanceof Error && ["PRICING_RULE_NOT_ACTIVE", "PRICING_RULE_CURRENCY_MISMATCH"].includes(error.message)) {
      const response = NextResponse.json(
        { error: "The active pricing rule for this request is no longer valid. Please contact support before quoting." },
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

    return handleApiError(error, "Proposals GET")
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
