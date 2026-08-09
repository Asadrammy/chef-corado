import { NextResponse } from "next/server"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { localDemoChefs } from "@/lib/local-demo-data"
import { isPrismaConnectionError } from "@/lib/prisma"
import { adminService } from "@/lib/services/admin-service"

// GET all chefs for admin
export async function GET() {
  try {
    await requireAdminPermission("chefs.review")
    const chefs = await adminService.listChefs()

    return NextResponse.json(chefs)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json(localDemoChefs)
    }

    return handleApiError(error, "Admin Chefs GET")
  }
}
