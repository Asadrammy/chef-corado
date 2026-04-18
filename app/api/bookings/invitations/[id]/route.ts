import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { requestInvitationService } from "@/lib/services/request-invitation-service"
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
    return handleApiError(error, "Booking invitations PATCH")
  }
}
