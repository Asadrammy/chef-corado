import { NextResponse } from "next/server"

import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { requestInvitationService } from "@/lib/services/request-invitation-service"
import { isPrismaConnectionError } from "@/lib/prisma"
import { Role } from "@/types"

const localDemoInvitations = [
  {
    id: "local-invitation-corporate",
    status: "PENDING",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    request: {
      id: "local-request-corporate",
      title: "Executive chef's table",
      description: "A discreet private dining evening for a small executive group.",
      eventDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Financial District",
      budget: 3100,
      details: "Premium ingredients, tight timing, and calm restaurant-level service.",
      client: {
        id: "local-client-sutton",
        name: "Sutton Group",
      },
    },
  },
]

export async function GET() {
  try {
    const session = await getRequiredSession(Role.CHEF)
    const result = await requestInvitationService.listInvitations(getSessionUserId(session))
    return NextResponse.json(result)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json({
        invitations: localDemoInvitations,
        localDemo: true,
      })
    }

    return handleApiError(error, "Booking invitations GET")
  }
}
