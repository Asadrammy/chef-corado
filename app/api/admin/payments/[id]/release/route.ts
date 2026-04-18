import { NextResponse } from "next/server"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { handleApiError } from "@/lib/error-handler"
import { adminPaymentService } from "@/lib/services/admin-payment-service"
import { Role } from "@/types"

// POST release payment to chef
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession(Role.ADMIN)
    const { id } = await params
    const updatedPayment = await adminPaymentService.releasePayment(id, getSessionUserId(session))

    return NextResponse.json({ 
      message: "Payment released successfully",
      payment: updatedPayment
    })
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (error instanceof Error && error.message === "PAYMENT_NOT_RELEASABLE") {
      return NextResponse.json({ error: "Payment cannot be released" }, { status: 400 })
    }

    return handleApiError(error, "Admin Payment Release POST")
  }
}
