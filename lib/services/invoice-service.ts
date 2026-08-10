import type { PrismaClient } from "@prisma/client"
import { getTaxPolicy } from "@/lib/marketplace-rules"

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

function buildReceiptNumber(paymentId: string, paidAt: Date) {
  const date = paidAt.toISOString().slice(0, 10).replace(/-/g, "")
  return `RCP-${date}-${paymentId.slice(-8).toUpperCase()}`
}

export const invoiceService = {
  async ensureReceiptForPayment(tx: TransactionClient, paymentId: string, createdBy = "SYSTEM") {
    const existing = await tx.invoice.findFirst({
      where: { paymentId },
    })

    if (existing) {
      return existing
    }

    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            client: { select: { name: true, email: true } },
            chef: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            experience: { select: { title: true } },
            proposal: {
              include: {
                request: { select: { title: true, eventType: true, serviceTypeLabel: true, countryCode: true } },
              },
            },
          },
        },
      },
    })

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND_FOR_RECEIPT")
    }

    const paidAt = payment.updatedAt ?? new Date()
    const serviceName =
      payment.booking.experience?.title ??
      payment.booking.proposal?.request.serviceTypeLabel ??
      payment.booking.proposal?.request.title ??
      payment.booking.proposal?.request.eventType ??
      "Chef booking"
    const countryCode = payment.booking.proposal?.request.countryCode ?? undefined
    const taxPolicy = getTaxPolicy(countryCode)

    return tx.invoice.create({
      data: {
        bookingId: payment.bookingId,
        paymentId: payment.id,
        invoiceNumber: buildReceiptNumber(payment.id, paidAt),
        currency: payment.currency,
        subtotalAmount: payment.totalAmount,
        taxAmount: 0,
        totalAmount: payment.totalAmount,
        status: "PAID_RECEIPT",
        recipientName: payment.booking.client.name,
        recipientEmail: payment.booking.client.email,
        issuedAt: paidAt,
        paidAt,
        internalNotes: JSON.stringify({
          kind: "PAYMENT_RECEIPT",
          bookingReference: payment.booking.id,
          serviceName,
          chefName: payment.booking.chef.user.name,
          commissionAmount: payment.commissionAmount,
          chefAmount: payment.chefAmount,
          taxPolicy: {
            country: taxPolicy.countryName,
            rate: taxPolicy.rate,
            label: taxPolicy.label,
            responsibility: taxPolicy.responsibility,
          },
          taxNotice: "ChefaChef receipt only. Formal tax invoices must be issued by chefs where required.",
        }),
        createdBy,
        updatedBy: createdBy,
      },
    })
  },
}
