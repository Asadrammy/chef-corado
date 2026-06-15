import { NextResponse } from "next/server"

import { getRequiredSession } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { localDemoBookings } from "@/lib/local-demo-data"
import { isPrismaConnectionError } from "@/lib/prisma"
import { adminService } from "@/lib/services/admin-service"
import { Role } from "@/types"

// GET all bookings for admin
export async function GET() {
  try {
    await getRequiredSession(Role.ADMIN)
    const bookings = await adminService.listBookings()

    return NextResponse.json(bookings)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(localDemoBookings)
    }

    return handleApiError(error, "Admin Bookings GET")
  }
}
