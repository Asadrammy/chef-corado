import { NextResponse } from "next/server"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { requestInvitationService } from "@/lib/services/request-invitation-service"
import { Role } from "@/types"

export async function GET() {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const result = await requestInvitationService.listInvitations(getSessionUserId(session))
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error, "Booking invitations GET")
  }
}
