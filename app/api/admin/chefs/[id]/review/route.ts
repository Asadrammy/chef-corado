import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { adminChefService } from "@/lib/services/admin-chef-service"

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "CHANGES_REQUESTED"]),
  reason: z.string().trim().max(2000).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminPermission("chefs.approve")
    const { id } = await params
    const body = reviewSchema.parse(await request.json())

    const chef =
      body.action === "APPROVE"
        ? await adminChefService.approveChef(id, actor.userId, body.reason)
        : body.action === "REJECT"
          ? await adminChefService.rejectChef(id, actor.userId, body.reason)
          : await adminChefService.requestChanges(id, actor.userId, body.reason)

    return NextResponse.json({
      message: "Chef review updated successfully",
      chef,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "CHEF_NOT_FOUND") {
      return NextResponse.json({ error: "Chef not found" }, { status: 404 })
    }

    return handleApiError(error, "Admin Chef Review POST")
  }
}

