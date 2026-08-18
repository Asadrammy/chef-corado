import { NextResponse } from "next/server"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { adminChefService } from "@/lib/services/admin-chef-service"

// POST reject a chef without deleting their profile
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminPermission("chefs.approve")
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const result = await adminChefService.rejectChef(id, actor.userId, body.reason)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "CHEF_NOT_FOUND") {
      return NextResponse.json({ error: "Chef not found" }, { status: 404 })
    }

    return handleApiError(error, "Admin Chef Reject POST")
  }
}
