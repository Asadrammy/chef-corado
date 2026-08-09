import { NextResponse } from "next/server"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { adminChefService } from "@/lib/services/admin-chef-service"

// POST approve a chef
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminPermission("chefs.approve")
    const { id } = await params
    const chef = await adminChefService.approveChef(id, actor.userId)

    return NextResponse.json({ 
      message: "Chef approved successfully",
      chef 
    })
  } catch (error) {
    return handleApiError(error, "Admin Chef Approve POST")
  }
}
