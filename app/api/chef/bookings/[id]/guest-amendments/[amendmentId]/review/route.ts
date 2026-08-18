import { NextRequest } from "next/server"
import { z } from "zod"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { bookingGuestAmendmentService } from "@/lib/services/booking-guest-amendment-service"
import { toMinorUnits } from "@/lib/payment-plan-rules"

const schema = z.object({
  approved: z.boolean(),
  amount: z.number().positive().optional(),
  note: z.string().trim().max(1000).optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; amendmentId: string }> }
) {
  try {
    const session = await getRequiredSession()
    if (session.user.role !== "CHEF") {
      return apiError("FORBIDDEN", "Only the assigned chef can review this guest amendment", 403)
    }

    const { id, amendmentId } = await context.params
    const payload = schema.parse(await request.json())
    const amendment = await bookingGuestAmendmentService.reviewAddGuestsByChef({
      bookingId: id,
      amendmentId,
      chefUserId: getSessionUserId(session),
      approved: payload.approved,
      amountMinor: payload.amount == null ? undefined : toMinorUnits(payload.amount),
      note: payload.note,
    })

    return apiSuccess({
      amendmentId: amendment.id,
      status: amendment.status,
      amount: amendment.incrementalAmountMinor / 100,
      currency: amendment.currency,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("VALIDATION_ERROR", "Validation failed", 400, error.errors.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })))
    }
    const message = error instanceof Error ? error.message : "Unable to review guest amendment"
    const status = message === "FORBIDDEN" ? 403 : message === "AMENDMENT_NOT_FOUND" ? 404 : 400
    return apiError("GUEST_AMENDMENT_REVIEW_FAILED", message, status)
  }
}
