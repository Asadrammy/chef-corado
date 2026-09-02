import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requestService } from "@/lib/services/request-service"
import { requestSchema } from "@/lib/validation-schemas"
import { Role } from "@/types"
import { withRequestPhotoFallback } from "@/lib/request-photo-schema"
import { assertChefCanViewRequest } from "@/lib/services/request-eligibility-service"

const requestNotesUpdateSchema = z.object({
  mode: z.literal("notes"),
  details: z.string().max(5000).optional(),
}).strict()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await params
    const userId = session.user.id
    const role = session.user.role

    const requestRecord = await withRequestPhotoFallback(
      () => prisma.request.findUnique({
        where: { id: requestId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              firstName: true,
            },
          },
          proposals: role === Role.CHEF ? {
            where: { chef: { userId } },
            include: {
              chef: {
                select: {
                  id: true,
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          } : false,
          photos: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              url: true,
              originalName: true,
              contentType: true,
              sizeBytes: true,
              sortOrder: true,
              createdAt: true,
            },
          },
        },
      }),
      () => prisma.request.findUnique({
        where: { id: requestId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              firstName: true,
            },
          },
          proposals: role === Role.CHEF ? {
            where: { chef: { userId } },
            include: {
              chef: {
                select: {
                  id: true,
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          } : false,
        },
      })
    )

    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (role === Role.CHEF) {
      const access = await assertChefCanViewRequest(userId, requestId).catch(() => null)
      if (!access) {
        return NextResponse.json({ error: "Request not available in your area" }, { status: 403 })
      }
    }

    return NextResponse.json({ request: requestRecord })
  } catch (error) {
    console.error("Request detail API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== Role.CLIENT) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await params
    const rawBody = await request.json()

    if (rawBody?.mode === "notes") {
      const body = requestNotesUpdateSchema.parse(rawBody)
      const updated = await requestService.updateRequestNotes(session.user.id, requestId, {
        details: body.details,
      })
      return NextResponse.json({ request: updated })
    }

    const body = requestSchema.parse(rawBody)
    const updated = await requestService.updateRequest(session.user.id, requestId, body)
    return NextResponse.json({ request: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 422 })
    }
    if (error instanceof Error) {
      if (error.message === "REQUEST_NOT_FOUND") {
        return NextResponse.json({ error: "Request not found" }, { status: 404 })
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (error.message === "REQUEST_EDIT_NOT_SUPPORTED" || error.message === "REQUEST_HAS_PROPOSALS") {
        return NextResponse.json({ error: "This request can no longer be edited." }, { status: 409 })
      }
      if (error.message === "REQUEST_SUPPORT_ONLY") {
        return NextResponse.json({ error: "This request can now only be updated through support." }, { status: 409 })
      }
      if (error.message.startsWith("MARKET_BOOKING_INACTIVE:")) {
        return NextResponse.json({ error: "ChefaChef is preparing to launch bookings in this market. Online booking is not yet available." }, { status: 403 })
      }
      if (error.message === "INVALID_SERVICE_TYPE" || error.message === "SERVICE_COUNTRY_NOT_SUPPORTED") {
        return NextResponse.json({ error: "Selected service is not supported for this country." }, { status: 422 })
      }
      if (error.message.startsWith("SERVICE_REQUIRED_QUESTIONS_MISSING:")) {
        return NextResponse.json({ error: "Please complete the required questions for the selected service." }, { status: 422 })
      }
      if (error.message.startsWith("PRICING_GUEST_COUNT_BELOW_MIN:")) {
        return NextResponse.json({ error: `Guest count is below the active pricing minimum (${error.message.split(":")[1]}).` }, { status: 422 })
      }
      if (error.message.startsWith("PRICING_GUEST_COUNT_ABOVE_MAX:")) {
        return NextResponse.json({ error: `Guest count exceeds the active pricing maximum (${error.message.split(":")[1]}).` }, { status: 422 })
      }
    }

    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
