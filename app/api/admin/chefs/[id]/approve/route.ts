import { NextResponse } from "next/server"

import { getRequiredSession } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { adminChefService } from "@/lib/services/admin-chef-service"
import { Role } from "@/types"

// POST approve a chef
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getRequiredSession(Role.ADMIN)
    const { id } = await params
    const chef = await adminChefService.approveChef(id)

    return NextResponse.json({ 
      message: "Chef approved successfully",
      chef 
    })
  } catch (error) {
    return handleApiError(error, "Admin Chef Approve POST")
  }
}
