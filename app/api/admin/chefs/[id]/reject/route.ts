import { NextResponse } from "next/server"

import { getRequiredSession } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { adminChefService } from "@/lib/services/admin-chef-service"
import { Role } from "@/types"

// POST reject a chef (delete their profile)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getRequiredSession(Role.ADMIN)
    const { id } = await params
    const result = await adminChefService.rejectChef(id)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "CHEF_NOT_FOUND") {
      return NextResponse.json({ error: "Chef not found" }, { status: 404 })
    }

    return handleApiError(error, "Admin Chef Reject POST")
  }
}
