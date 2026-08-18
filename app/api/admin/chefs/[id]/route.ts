import { NextResponse } from "next/server"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { adminChefService } from "@/lib/services/admin-chef-service"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminPermission("chefs.review")
    const { id } = await params
    const chef = await adminChefService.getChefForReview(id)

    return NextResponse.json({ chef })
  } catch (error) {
    if (error instanceof Error && error.message === "CHEF_NOT_FOUND") {
      return NextResponse.json({ error: "Chef not found" }, { status: 404 })
    }

    return handleApiError(error, "Admin Chef Detail GET")
  }
}

