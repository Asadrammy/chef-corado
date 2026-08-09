import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { payoutService } from "@/lib/services/payout-service"

const payoutActionSchema = z.object({
  action: z.enum(["approve", "process", "pay", "complete", "fail", "cancel", "retry"]),
  externalReference: z.string().max(200).optional(),
  adminNotes: z.string().max(1000).optional(),
  failureReason: z.string().max(1000).optional(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminPermission("payouts.process")
    const { id } = await context.params
    const payload = payoutActionSchema.parse(await request.json())

    const payout = await payoutService.updatePayoutStatus(id, {
      ...payload,
      processedBy: actor.userId,
    })

    return NextResponse.json({ payout })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    if (error instanceof Error && error.message === "PAYOUT_NOT_FOUND") {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 })
    }
    if (error instanceof Error && error.message === "EXTERNAL_REFERENCE_REQUIRED") {
      return NextResponse.json({ error: "External reference is required before marking a manual payout paid." }, { status: 422 })
    }
    if (error instanceof Error && error.message.startsWith("INVALID_PAYOUT_TRANSITION")) {
      return NextResponse.json({ error: "Invalid payout status transition." }, { status: 422 })
    }
    return handleApiError(error, "Admin Payout PATCH")
  }
}
