import type Stripe from "stripe"

import { normalizeCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { refundService } from "@/lib/services/refund-service"
import { generateIdempotencyKey } from "@/lib/utils/idempotency"
import {
  CHEF_REVIEW_REDUCTION_THRESHOLD,
  fromMinorUnits,
  GUEST_AMENDMENT_STATUS,
  GUEST_AMENDMENT_TYPES,
  GUEST_REDUCTION_REFUND_WINDOW_DAYS,
  PAYMENT_INSTALLMENT_STATUS,
  toMinorUnits,
} from "@/lib/payment-plan-rules"
import { createNotification } from "@/lib/notifications"

function assertUpcomingBooking(eventDate: Date) {
  if (eventDate.getTime() <= Date.now()) {
    throw new Error("BOOKING_NOT_UPCOMING")
  }
}

function daysUntil(date: Date, now = new Date()) {
  return (date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
}

async function getBookingForAmendment(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: true,
      chef: { include: { user: true } },
      payments: true,
      paymentPlan: true,
      pricingSnapshot: true,
      guestAmendments: {
        where: {
          status: {
            in: [
              GUEST_AMENDMENT_STATUS.REQUESTED,
              GUEST_AMENDMENT_STATUS.PENDING_PAYMENT,
              GUEST_AMENDMENT_STATUS.CHEF_REVIEW_REQUIRED,
              GUEST_AMENDMENT_STATUS.REFUND_PENDING,
            ],
          },
        },
      },
    },
  })

  if (!booking) throw new Error("BOOKING_NOT_FOUND")
  return booking
}

function currentCounts(booking: { adultCount: number | null; childrenUnder10: number | null; guestCount: number }) {
  return {
    adultCount: booking.adultCount ?? booking.guestCount,
    childrenUnder10: booking.childrenUnder10 ?? 0,
    guestCount: booking.guestCount,
  }
}

function getSnapshotPricing(booking: Awaited<ReturnType<typeof getBookingForAmendment>>) {
  const snapshot = booking.pricingSnapshot
  if (!snapshot?.perPersonAmountMinor) {
    return null
  }
  const explicitPricingBasis = [
    "EXPLICIT_PER_PERSON_RATE",
    "PROPOSAL_PER_PERSON_RATE",
    "SERVICE_PRICING_RULE_PER_PERSON",
    "CHEF_APPROVED_PER_PERSON_RATE",
  ]
  if (!explicitPricingBasis.includes(snapshot.pricingBasis)) {
    return null
  }
  return {
    pricingBasis: snapshot.pricingBasis,
    perPersonAmountMinor: snapshot.perPersonAmountMinor,
    currency: normalizeCurrency(snapshot.currency || booking.currency),
  }
}

export const bookingGuestAmendmentService = {
  async requestAddGuests(input: {
    bookingId: string
    requesterId: string
    requesterRole: string
    addedAdultCount?: number
    addedChildrenUnder10?: number
  }) {
    const booking = await getBookingForAmendment(input.bookingId)
    if (booking.clientId !== input.requesterId) throw new Error("FORBIDDEN")
    if (booking.status !== "CONFIRMED") throw new Error("BOOKING_NOT_AMENDABLE")
    assertUpcomingBooking(booking.eventDate)
    if (booking.guestAmendments.length) throw new Error("GUEST_AMENDMENT_ALREADY_PENDING")

    const addedAdultCount = input.addedAdultCount ?? 0
    const addedChildrenUnder10 = input.addedChildrenUnder10 ?? 0
    if (!Number.isInteger(addedAdultCount) || !Number.isInteger(addedChildrenUnder10) || addedAdultCount < 0 || addedChildrenUnder10 < 0) {
      throw new Error("INVALID_GUEST_COUNTS")
    }
    const addedGuestCount = addedAdultCount + addedChildrenUnder10
    if (addedGuestCount <= 0) throw new Error("NO_GUESTS_ADDED")

    const previous = currentCounts(booking)
    const pricing = getSnapshotPricing(booking)
    const status = pricing ? GUEST_AMENDMENT_STATUS.PENDING_PAYMENT : GUEST_AMENDMENT_STATUS.CHEF_REVIEW_REQUIRED
    const incrementalAmountMinor = pricing ? pricing.perPersonAmountMinor * addedGuestCount : 0
    const currency = pricing?.currency ?? normalizeCurrency(booking.currency)

    const amendment = await prisma.bookingGuestAmendment.create({
      data: {
        bookingId: booking.id,
        paymentPlanId: booking.paymentPlan?.id,
        requesterId: input.requesterId,
        requesterRole: input.requesterRole,
        amendmentType: GUEST_AMENDMENT_TYPES.ADD_GUESTS,
        previousAdultCount: previous.adultCount,
        previousChildrenUnder10: previous.childrenUnder10,
        previousGuestCount: previous.guestCount,
        requestedAdultCount: previous.adultCount + addedAdultCount,
        requestedChildrenUnder10: previous.childrenUnder10 + addedChildrenUnder10,
        requestedGuestCount: previous.guestCount + addedGuestCount,
        addedAdultCount,
        addedChildrenUnder10,
        pricingBasis: pricing?.pricingBasis ?? "CHEF_APPROVAL_REQUIRED",
        incrementalAmountMinor,
        currency,
        status,
        idempotencyKey: generateIdempotencyKey("ADD_GUESTS", booking.id, {
          requesterId: input.requesterId,
          addedAdultCount,
          addedChildrenUnder10,
          previousGuestCount: previous.guestCount,
        }),
      },
    })

    if (status === GUEST_AMENDMENT_STATUS.CHEF_REVIEW_REQUIRED) {
      await Promise.allSettled([
        createNotification(
          booking.clientId,
          "GUEST_AMENDMENT_CHEF_REVIEW" as any,
          "Your request to add guests has been sent to the chef for pricing approval."
        ),
        createNotification(
          booking.chef.userId,
          "GUEST_AMENDMENT_CHEF_REVIEW" as any,
          `A client requested ${addedGuestCount} additional guest${addedGuestCount === 1 ? "" : "s"} for booking ${booking.id}. Please approve the additional price or reject the request.`
        ),
      ])
    }

    return amendment
  },

  async reviewAddGuestsByChef(input: {
    bookingId: string
    amendmentId: string
    chefUserId: string
    approved: boolean
    amountMinor?: number
    note?: string
  }) {
    const amendment = await prisma.bookingGuestAmendment.findUnique({
      where: { id: input.amendmentId },
      include: { booking: { include: { chef: true } } },
    })
    if (!amendment) throw new Error("AMENDMENT_NOT_FOUND")
    if (amendment.bookingId !== input.bookingId) throw new Error("BOOKING_MISMATCH")
    if (amendment.booking.chef.userId !== input.chefUserId) throw new Error("FORBIDDEN")
    if (amendment.amendmentType !== GUEST_AMENDMENT_TYPES.ADD_GUESTS) throw new Error("AMENDMENT_TYPE_MISMATCH")
    if (amendment.status !== GUEST_AMENDMENT_STATUS.CHEF_REVIEW_REQUIRED) throw new Error("AMENDMENT_NOT_REVIEWABLE")

    if (!input.approved) {
      const rejected = await prisma.bookingGuestAmendment.update({
        where: { id: amendment.id },
        data: {
          status: GUEST_AMENDMENT_STATUS.REJECTED,
          chefReviewNotes: input.note,
          chefDecisionAt: new Date(),
          chefDecisionBy: input.chefUserId,
        },
      })
      await createNotification(
        amendment.booking.clientId,
        "GUEST_AMENDMENT_REJECTED" as any,
        `The chef cannot accommodate the requested additional guests for booking ${amendment.bookingId}.`
      )
      return rejected
    }

    if (!Number.isInteger(input.amountMinor) || (input.amountMinor ?? 0) <= 0) {
      throw new Error("INVALID_APPROVED_AMOUNT")
    }
    const approvedAmountMinor = input.amountMinor as number

    const approved = await prisma.bookingGuestAmendment.update({
      where: { id: amendment.id },
      data: {
        status: GUEST_AMENDMENT_STATUS.PENDING_PAYMENT,
        incrementalAmountMinor: approvedAmountMinor,
        pricingBasis: "CHEF_APPROVED_ADDITIONAL_GUEST_PRICE",
        chefReviewNotes: input.note,
        chefDecisionAt: new Date(),
        chefDecisionBy: input.chefUserId,
      },
    })
    await createNotification(
      amendment.booking.clientId,
      "GUEST_AMENDMENT_PRICE_APPROVED" as any,
      `The chef approved an additional guest price of ${fromMinorUnits(approvedAmountMinor)} ${amendment.currency}. Please complete payment before the guest count is updated.`
    )
    return approved
  },

  async attachCheckoutSession(input: {
    amendmentId: string
    stripeCheckoutSessionId: string
  }) {
    return prisma.bookingGuestAmendment.update({
      where: { id: input.amendmentId },
      data: { stripeCheckoutSessionId: input.stripeCheckoutSessionId },
    })
  },

  async processAddGuestCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const amendmentId = session.metadata?.amendmentId
    if (!amendmentId) return false
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null
    if (!paymentIntentId) throw new Error("PAYMENT_INTENT_REQUIRED")
    if (session.payment_status !== "paid") throw new Error("CHECKOUT_SESSION_NOT_PAID")

    await prisma.$transaction(async (tx) => {
      const amendment = await tx.bookingGuestAmendment.findUnique({
        where: { id: amendmentId },
        include: { booking: { include: { chef: { include: { user: true } } } } },
      })
      if (!amendment) throw new Error("AMENDMENT_NOT_FOUND")
      if (amendment.status === GUEST_AMENDMENT_STATUS.APPLIED) return
      if (amendment.amendmentType !== GUEST_AMENDMENT_TYPES.ADD_GUESTS) throw new Error("AMENDMENT_TYPE_MISMATCH")
      if (amendment.status !== GUEST_AMENDMENT_STATUS.PENDING_PAYMENT) throw new Error("AMENDMENT_NOT_PAYABLE")
      if (session.amount_total != null && session.amount_total !== amendment.incrementalAmountMinor) {
        throw new Error("STRIPE_AMOUNT_MISMATCH")
      }
      if (session.currency && session.currency.toUpperCase() !== amendment.currency.toUpperCase()) {
        throw new Error("STRIPE_CURRENCY_MISMATCH")
      }

      const claim = await tx.bookingGuestAmendment.updateMany({
        where: { id: amendment.id, status: GUEST_AMENDMENT_STATUS.PENDING_PAYMENT },
        data: {
          status: GUEST_AMENDMENT_STATUS.PAID,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
        },
      })
      if (claim.count === 0) return

      const incrementalAmount = fromMinorUnits(amendment.incrementalAmountMinor)
      await tx.booking.update({
        where: { id: amendment.bookingId },
        data: {
          adultCount: amendment.requestedAdultCount,
          childrenUnder10: amendment.requestedChildrenUnder10,
          guestCount: amendment.requestedGuestCount,
          totalPrice: { increment: incrementalAmount },
          version: { increment: 1 },
        },
      })

      if (amendment.paymentPlanId) {
        await tx.paymentPlan.update({
          where: { id: amendment.paymentPlanId },
          data: {
            totalAmountMinor: { increment: amendment.incrementalAmountMinor },
            paidAmountMinor: { increment: amendment.incrementalAmountMinor },
          },
        })
      }

      await tx.bookingGuestAmendment.update({
        where: { id: amendment.id },
        data: {
          status: GUEST_AMENDMENT_STATUS.APPLIED,
          finalizedAt: new Date(),
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
        },
      })

      await tx.ledger.create({
        data: {
          transactionType: "PAYMENT",
          amount: incrementalAmount,
          currency: amendment.currency,
          bookingId: amendment.bookingId,
          fromAccount: "CLIENT_STRIPE",
          toAccount: "PLATFORM_HOLDING",
          description: "Add Guests amendment payment received",
          metadata: JSON.stringify({ amendmentId: amendment.id, stripeCheckoutSessionId: session.id, stripePaymentIntentId: paymentIntentId }),
          createdBy: "SYSTEM",
        },
      })

      await tx.notification.createMany({
        data: [
          {
            userId: amendment.booking.clientId,
            type: "GUESTS_ADDED",
            message: `Guest count updated to ${amendment.requestedGuestCount}.`,
          },
          {
            userId: amendment.booking.chef.userId,
            type: "GUESTS_ADDED",
            message: `Guests were added to booking ${amendment.bookingId}. New guest count: ${amendment.requestedGuestCount}.`,
          },
        ],
      })
    })

    logger.info("[GUEST_AMENDMENT] Add Guests payment applied", { amendmentId, sessionId: session.id })
    return true
  },

  async requestReductionByAdmin(input: {
    bookingId: string
    adminId: string
    adminRole: string
    removeAdultCount?: number
    removeChildrenUnder10?: number
    notes?: string
  }) {
    if (input.adminRole !== "ADMIN") throw new Error("FORBIDDEN")
    const booking = await getBookingForAmendment(input.bookingId)
    if (booking.status !== "CONFIRMED") throw new Error("BOOKING_NOT_AMENDABLE")
    assertUpcomingBooking(booking.eventDate)
    if (booking.guestAmendments.length) throw new Error("GUEST_AMENDMENT_ALREADY_PENDING")

    const removeAdultCount = input.removeAdultCount ?? 0
    const removeChildrenUnder10 = input.removeChildrenUnder10 ?? 0
    if (!Number.isInteger(removeAdultCount) || !Number.isInteger(removeChildrenUnder10) || removeAdultCount < 0 || removeChildrenUnder10 < 0) {
      throw new Error("INVALID_GUEST_COUNTS")
    }
    const removedGuestCount = removeAdultCount + removeChildrenUnder10
    if (removedGuestCount <= 0) throw new Error("NO_GUESTS_REMOVED")

    const previous = currentCounts(booking)
    if (removedGuestCount >= previous.guestCount) throw new Error("REDUCTION_EXCEEDS_GUEST_COUNT")

    const reductionPercent = removedGuestCount / Math.max(previous.guestCount, 1)
    const pricing = getSnapshotPricing(booking)
    const eventMoreThan7DaysAway = daysUntil(booking.eventDate) > GUEST_REDUCTION_REFUND_WINDOW_DAYS
    const chefReviewRequired = reductionPercent > CHEF_REVIEW_REDUCTION_THRESHOLD
    const refundAmountMinor = eventMoreThan7DaysAway && pricing ? pricing.perPersonAmountMinor * removedGuestCount : 0
    const status = chefReviewRequired
      ? GUEST_AMENDMENT_STATUS.CHEF_REVIEW_REQUIRED
      : refundAmountMinor > 0
        ? GUEST_AMENDMENT_STATUS.REFUND_PENDING
        : GUEST_AMENDMENT_STATUS.APPROVED

    const amendment = await prisma.bookingGuestAmendment.create({
      data: {
        bookingId: booking.id,
        paymentPlanId: booking.paymentPlan?.id,
        requesterId: input.adminId,
        requesterRole: input.adminRole,
        amendmentType: GUEST_AMENDMENT_TYPES.REDUCE_GUESTS,
        previousAdultCount: previous.adultCount,
        previousChildrenUnder10: previous.childrenUnder10,
        previousGuestCount: previous.guestCount,
        requestedAdultCount: Math.max(previous.adultCount - removeAdultCount, 0),
        requestedChildrenUnder10: Math.max(previous.childrenUnder10 - removeChildrenUnder10, 0),
        requestedGuestCount: previous.guestCount - removedGuestCount,
        removedAdultCount: removeAdultCount,
        removedChildrenUnder10: removeChildrenUnder10,
        reductionPercent,
        pricingBasis: pricing?.pricingBasis ?? "MANUAL_REVIEW_REQUIRED",
        refundAmountMinor,
        currency: pricing?.currency ?? normalizeCurrency(booking.currency),
        status,
        adminNotes: input.notes,
        idempotencyKey: generateIdempotencyKey("REDUCE_GUESTS", booking.id, {
          adminId: input.adminId,
          removeAdultCount,
          removeChildrenUnder10,
          previousGuestCount: previous.guestCount,
        }),
      },
    })

    if (status === GUEST_AMENDMENT_STATUS.CHEF_REVIEW_REQUIRED) {
      await createNotification(
        booking.chef.userId,
        "CHEF_REVIEW_REQUIRED" as any,
        `Guest reduction over 20% requested for booking ${booking.id}. Please review whether the menu and quote remain valid.`
      )
      return amendment
    }

    if (status === GUEST_AMENDMENT_STATUS.REFUND_PENDING && booking.payments) {
      const refund = await refundService.createRefundRequest({
        paymentId: booking.payments.id,
        amount: fromMinorUnits(refundAmountMinor),
        reason: "OTHER",
        description: `Guest reduction amendment ${amendment.id}`,
        requestedBy: input.adminId,
      })
      return prisma.bookingGuestAmendment.update({
        where: { id: amendment.id },
        data: { refundId: refund.id },
      })
    }

    return amendment
  },

  async markAmendmentPaymentFailed(stripePaymentIntentId: string, amendmentId?: string | null) {
    const amendment = amendmentId
      ? await prisma.bookingGuestAmendment.findUnique({ where: { id: amendmentId } })
      : await prisma.bookingGuestAmendment.findUnique({ where: { stripePaymentIntentId } })
    if (!amendment) return false
    await prisma.bookingGuestAmendment.update({
      where: { id: amendment.id },
      data: { status: GUEST_AMENDMENT_STATUS.PENDING_PAYMENT },
    })
    return true
  },
}
