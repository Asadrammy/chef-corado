import { NextRequest } from "next/server"
import { z } from "zod"

import { apiError, apiSuccess } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/admin-rbac"
import { bookingGuestAmendmentService } from "@/lib/services/booking-guest-amendment-service"
import { fromMinorUnits } from "@/lib/payment-plan-rules"

const schema = z.object({
  removeAdultCount: z.number().int().min(0).max(200).default(0),
  removeChildrenUnder10: z.number().int().min(0).max(200).default(0),
  notes: z.string().trim().max(2000).optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAdminPermission("bookings.modify")
    const { id } = await context.params
    const payload = schema.parse(await request.json())

    const amendment = await bookingGuestAmendmentService.requestReductionByAdmin({
      bookingId: id,
      adminId: actor.userId,
      adminRole: actor.adminRole,
      removeAdultCount: payload.removeAdultCount,
      removeChildrenUnder10: payload.removeChildrenUnder10,
      notes: payload.notes,
    })

    return apiSuccess({
      amendmentId: amendment.id,
      status: amendment.status,
      reductionPercent: amendment.reductionPercent,
      refundAmount: amendment.refundAmountMinor ? fromMinorUnits(amendment.refundAmountMinor) : 0,
      currency: amendment.currency,
      refundId: amendment.refundId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("VALIDATION_ERROR", "Validation failed", 400, error.errors.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })))
    }

    const message = error instanceof Error ? error.message : "Unable to reduce guests"
    const status = message === "FORBIDDEN" ? 403 : message === "BOOKING_NOT_FOUND" ? 404 : 400
    return apiError("GUEST_REDUCTION_FAILED", message, status)
  }
}
