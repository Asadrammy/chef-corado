import { NextResponse } from "next/server"

import { getRequiredSession } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { adminService } from "@/lib/services/admin-service"
import { Role } from "@/types"

// GET all payments for admin
export async function GET() {
  try {
    await getRequiredSession(Role.ADMIN)
    const payments = await adminService.listPayments()

    return NextResponse.json(payments)
  } catch (error) {
    return handleApiError(error, "Admin Payments GET")
  }
}
