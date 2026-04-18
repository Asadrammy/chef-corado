import { NextResponse } from "next/server"

import { getRequiredSession } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { adminService } from "@/lib/services/admin-service"
import { Role } from "@/types"

// GET all chefs for admin
export async function GET() {
  try {
    await getRequiredSession(Role.ADMIN)
    const chefs = await adminService.listChefs()

    return NextResponse.json(chefs)
  } catch (error) {
    return handleApiError(error, "Admin Chefs GET")
  }
}
