import { prisma } from "@/lib/prisma"

export const paymentRepository = {
  findBookingByProposalId(proposalId: string) {
    return prisma.booking.findUnique({
      where: { proposalId },
      include: { payments: true, proposal: true },
    })
  },

  createWebhookLog(stripeEventId: string, eventType: string, payload: string) {
    return prisma.webhookLog.create({
      data: {
        stripeEventId,
        eventType,
        payload,
        status: "PENDING",
      },
    })
  },

  findWebhookLogByStripeEventId(stripeEventId: string) {
    return prisma.webhookLog.findUnique({
      where: { stripeEventId },
    })
  },

  updateWebhookLog(id: string, status: string, errorMessage?: string) {
    return prisma.webhookLog.update({
      where: { id },
      data: {
        status,
        processedAt: new Date(),
        ...(errorMessage ? { errorMessage } : {}),
      },
    })
  },
}
