import { NextResponse } from "next/server"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { localDemoPayments } from "@/lib/local-demo-data"
import { isPrismaConnectionError } from "@/lib/prisma"
import { adminService } from "@/lib/services/admin-service"

// GET all payments for admin
export async function GET() {
  try {
    await requireAdminPermission("payments.view")
    const payments = await adminService.listPayments()

    return NextResponse.json(payments)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(localDemoPayments)
    }

    return handleApiError(error, "Admin Payments GET")
  }
}
