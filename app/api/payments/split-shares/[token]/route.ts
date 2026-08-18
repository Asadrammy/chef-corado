import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { fromMinorUnits, hashSecureToken, PAYMENT_INSTALLMENT_STATUS } from "@/lib/payment-plan-rules"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    const share = await prisma.splitBillShare.findUnique({
      where: { tokenHash: hashSecureToken(token) },
      include: {
        installment: true,
        paymentPlan: {
          include: {
            proposal: {
              include: {
                chef: { include: { user: { select: { name: true } } } },
                request: {
                  select: {
                    title: true,
                    eventDate: true,
                    location: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!share || !share.installment) {
      return apiError("NOT_FOUND", "Split bill share not found", 404)
    }

    const expired = share.tokenExpiresAt.getTime() <= Date.now()
    return apiSuccess({
      id: share.id,
      amount: fromMinorUnits(share.amountMinor),
      currency: share.currency,
      status: share.status,
      paid: share.status === PAYMENT_INSTALLMENT_STATUS.PAID || share.installment.status === PAYMENT_INSTALLMENT_STATUS.PAID,
      expired,
      deadlineAt: share.deadlineAt,
      tokenExpiresAt: share.tokenExpiresAt,
      event: {
        title: share.paymentPlan.proposal.request.title,
        date: share.paymentPlan.proposal.request.eventDate,
        location: share.paymentPlan.proposal.request.location,
        chefName: share.paymentPlan.proposal.chef.user.name,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load split bill share"
    return apiError("SPLIT_SHARE_LOOKUP_FAILED", message, 400)
  }
}
