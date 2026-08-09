import { NextResponse } from "next/server"
import { requireAdminPermission } from "@/lib/admin-rbac"
import { handleApiError } from "@/lib/error-handler"
import { adminPaymentService } from "@/lib/services/admin-payment-service"

// POST release payment to chef
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("payouts.process")
    const { id } = await params
    const updatedPayment = await adminPaymentService.releasePayment(id, session.userId)

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
