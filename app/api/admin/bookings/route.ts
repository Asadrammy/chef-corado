import { NextResponse } from "next/server"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { localDemoBookings } from "@/lib/local-demo-data"
import { isPrismaConnectionError } from "@/lib/prisma"
import { adminService } from "@/lib/services/admin-service"

// GET all bookings for admin
export async function GET() {
  try {
    await requireAdminPermission("bookings.view")
    const bookings = await adminService.listBookings()

    return NextResponse.json(bookings)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(localDemoBookings)
    }

    return handleApiError(error, "Admin Bookings GET")
  }
}
