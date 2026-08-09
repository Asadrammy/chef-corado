import { NextResponse } from "next/server"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { adminChefService } from "@/lib/services/admin-chef-service"

// POST reject a chef (delete their profile)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminPermission("chefs.review")
    const { id } = await params
    const result = await adminChefService.rejectChef(id, actor.userId)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "CHEF_NOT_FOUND") {
      return NextResponse.json({ error: "Chef not found" }, { status: 404 })
    }

    return handleApiError(error, "Admin Chef Reject POST")
  }
}
