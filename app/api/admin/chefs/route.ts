import { NextResponse } from "next/server"

import { getRequiredSession } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { localDemoChefs } from "@/lib/local-demo-data"
import { isPrismaConnectionError } from "@/lib/prisma"
import { adminService } from "@/lib/services/admin-service"
import { Role } from "@/types"

// GET all chefs for admin
export async function GET() {
  try {
    await getRequiredSession(Role.ADMIN)
    const chefs = await adminService.listChefs()

    return NextResponse.json(chefs)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(localDemoChefs)
    }

    return handleApiError(error, "Admin Chefs GET")
  }
}
