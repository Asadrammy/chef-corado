import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { requestInvitationService } from "@/lib/services/request-invitation-service"
import { isPrismaConnectionError } from "@/lib/prisma"
import { Role } from "@/types"

const invitationActionSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const { id } = await context.params
    const body = await request.json()
    const payload = invitationActionSchema.parse(body)

    const invitation = await requestInvitationService.respondToInvitation(
      getSessionUserId(session),
      id,
      payload.status
    )

    return NextResponse.json({ invitation })
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: "Invitations are unavailable in local demo mode" },
        { status: 503 }
      )
    }

    return handleApiError(error, "Booking invitations PATCH")
  }
}
