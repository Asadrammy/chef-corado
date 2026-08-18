import type Stripe from "stripe"
import type { Prisma } from "@prisma/client"

import { normalizeCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getProposalBookingCounts } from "@/lib/booking-counts"
import { generateIdempotencyKey } from "@/lib/utils/idempotency"
import { marketConfigurationService } from "@/lib/services/market-configuration-service"
import { paymentGuarantee } from "@/lib/services/payment-guarantee"
import { ledgerService } from "@/lib/services/ledger-service"
import { bookingInsuranceService } from "@/lib/services/booking-insurance-service"
import {
  addDays,
  assertPlanTypeAllowed,
  fromMinorUnits,
  generateSecureToken,
  getPaymentEligibility,
  getNextBalanceRetryAt,
  GUEST_AMENDMENT_STATUS,
  GUEST_AMENDMENT_TYPES,
  hashSecureToken,
  PAYMENT_INSTALLMENT_KIND,
  PAYMENT_INSTALLMENT_STATUS,
  PAYMENT_PLAN_STATUS,
  PAYMENT_PLAN_TYPES,
  PAYMENT_RECOVERY_GRACE_DAYS,
  isInsideBalanceFinalRiskWindow,
  STANDARD_DEPOSIT_BASIS_POINTS,
  STANDARD_DEPOSIT_PERCENT,
  splitDepositBalance,
  splitEvenly,
  sumMinorUnits,
  toMinorUnits,
  type PaymentPlanType,
} from "@/lib/payment-plan-rules"
import { findBlockingProposalCheckoutLocks, releaseProposalCheckoutLocks } from "@/lib/services/proposal-checkout-locks"
import { BookingStatus, ProposalStatus } from "@/types"

type Tx = Prisma.TransactionClient

type SplitShareInput = {
  payerName?: string | null
  payerEmail?: string | null
  amountMinor?: number | null
}

function isPlanType(value: string): value is PaymentPlanType {
  return Object.values(PAYMENT_PLAN_TYPES).includes(value as PaymentPlanType)
}

function safeJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null))
}

async function getProposalForPlan(proposalId: string, clientId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      chef: { include: { user: true } },
      request: { include: { client: true, multiDayDates: { orderBy: { sortOrder: "asc" } } } },
      paymentPlan: { include: { installments: true, splitShares: true } },
    },
  })

  if (!proposal) throw new Error("PROPOSAL_NOT_FOUND")
  if (proposal.request.clientId !== clientId) throw new Error("FORBIDDEN")
  if (!["ACCEPTED", "ACCEPTED_PENDING_PAYMENT"].includes(proposal.status)) {
    throw new Error("PROPOSAL_NOT_PAYABLE")
  }

  await marketConfigurationService.assertPaymentMarketEnabled(proposal.request.countryCode)
  return proposal
}

async function ensureAcceptedPricingSnapshot(tx: Tx, bookingId: string) {
  const existing = await tx.acceptedPricingSnapshot.findUnique({ where: { bookingId } })
  if (existing) return existing

  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: {
      serviceDates: { orderBy: { sortOrder: "asc" } },
      proposal: {
        include: {
          request: { include: { multiDayDates: { orderBy: { sortOrder: "asc" } } } },
        },
      },
    },
  })

  if (!booking?.proposal?.request) {
    throw new Error("BOOKING_PRICING_SOURCE_NOT_FOUND")
  }

  const request = booking.proposal.request
  const acceptedTotalMinor = toMinorUnits(booking.totalPrice)
  const finance = await marketConfigurationService.calculateFinancials({
    grossAmount: booking.totalPrice,
    countryCode: request.countryCode,
    currency: booking.currency,
  })

  return tx.acceptedPricingSnapshot.create({
    data: {
      bookingId,
      proposalId: booking.proposal.id,
      requestId: request.id,
      originalAdultCount: booking.adultCount,
      originalChildrenUnder10: booking.childrenUnder10,
      originalGuestCount: booking.guestCount,
      originalActualAttendeeCount: booking.actualAttendeeCount,
      originalBillableGuestCount: booking.billableGuestCount,
      originalPricingGuestCount: booking.pricingGuestCount,
      acceptedTotalMinor,
      currency: normalizeCurrency(booking.currency),
      minimumSpendMinor: null,
      perPersonAmountMinor: null,
      pricingBasis: "CHEF_APPROVAL_REQUIRED_FOR_ADDITIONAL_GUESTS",
      pricingRuleVersion: booking.pricingRuleVersion,
      commissionRate: finance.platformCommissionRate,
      serviceContext: safeJson({
        bookingType: booking.bookingType,
        serviceType: booking.serviceType,
        serviceTypeLabel: booking.serviceTypeLabel,
        countryCode: request.countryCode,
      }),
      serviceDates: safeJson(booking.serviceDates),
    },
  })
}

async function createPlanBookingWithoutLegacyPayment(input: {
  proposalId: string
  paymentPlanId: string
  tx: Tx
}) {
  const { proposalId, paymentPlanId, tx } = input
  const existingBooking = await tx.booking.findFirst({ where: { proposalId } })
  if (existingBooking) {
    await tx.paymentPlan.update({ where: { id: paymentPlanId }, data: { bookingId: existingBooking.id } })
    await ensureAcceptedPricingSnapshot(tx, existingBooking.id)
    await bookingInsuranceService.ensureCoverageForBooking(existingBooking.id, {
      tx,
      qualificationBasis: "PAYMENT_PLAN_EXISTING_PLATFORM_BOOKING",
    }).catch((error) => {
      if (error instanceof Error && error.message.startsWith("BOOKING_NOT_INSURANCE_QUALIFIED")) return null
      throw error
    })
    return existingBooking
  }

  const proposal = await tx.proposal.findUnique({
    where: { id: proposalId },
    include: {
      request: { include: { multiDayDates: { orderBy: { sortOrder: "asc" } } } },
      chef: { include: { user: true } },
    },
  })

  if (!proposal) throw new Error("PROPOSAL_NOT_FOUND")
  if (!["ACCEPTED", "ACCEPTED_PENDING_PAYMENT"].includes(proposal.status)) {
    throw new Error(`PROPOSAL_NOT_PAYABLE:${proposal.status}`)
  }

  const requestedServiceDates = proposal.request.multiDayDates?.length
    ? proposal.request.multiDayDates
    : [{
        date: proposal.request.eventDate,
        startTime: proposal.request.eventTime,
        endTime: null,
        serviceType: proposal.request.serviceType,
        serviceTypeLabel: proposal.request.serviceTypeLabel,
        cuisineTypes: proposal.request.cuisineTypes,
        dietaryRequirements: proposal.request.dietaryRequirements,
        adultCount: proposal.request.adultCount,
        childrenUnder10: proposal.request.childrenUnder10,
        actualAttendeeCount: proposal.request.actualAttendeeCount,
        billableGuestCount: proposal.request.billableGuestCount,
        pricingGuestCount: proposal.request.pricingGuestCount,
        notes: proposal.request.details,
        sortOrder: 0,
      }]

  const availabilitySlots = []
  for (const serviceDate of requestedServiceDates) {
    const slot = await tx.availability.findFirst({
      where: {
        chefId: proposal.chefId,
        date: serviceDate.date,
        isAvailable: true,
        currentBookings: { lt: tx.availability.fields.maxBookings },
      },
    })
    if (!slot) {
      throw new Error(`SLOT_NO_LONGER_AVAILABLE:${serviceDate.date.toISOString().slice(0, 10)}`)
    }
    availabilitySlots.push(slot)
  }

  const blockingLocks = await findBlockingProposalCheckoutLocks({
    proposalId,
    availabilityIds: availabilitySlots.map((slot) => slot.id),
    tx,
  })
  if (blockingLocks.length) {
    throw new Error("SELECTED_DATE_RESERVED_BY_ACTIVE_CHECKOUT")
  }

  const bookingCounts = getProposalBookingCounts(proposal.request)
  const idempotencyKey = generateIdempotencyKey("PAYMENT_PLAN_BOOKING", paymentPlanId, { proposalId })
  const booking = await tx.booking.create({
    data: {
      clientId: proposal.request.clientId,
      chefId: proposal.chefId,
      proposalId: proposal.id,
      totalPrice: proposal.price,
      currency: proposal.request.currency || proposal.currency || "GBP",
      status: BookingStatus.CONFIRMED,
      eventDate: proposal.request.eventDate,
      location: proposal.request.location,
      latitude: proposal.request.latitude,
      longitude: proposal.request.longitude,
      guestCount: bookingCounts.guestCount,
      adultCount: bookingCounts.adultCount,
      childrenUnder10: bookingCounts.childrenUnder10,
      actualAttendeeCount: bookingCounts.actualAttendeeCount,
      billableGuestCount: bookingCounts.billableGuestCount,
      pricingGuestCount: bookingCounts.pricingGuestCount,
      studentCount: bookingCounts.studentCount,
      bookingType: "PROPOSAL",
      serviceType: bookingCounts.serviceType,
      serviceTypeLabel: bookingCounts.serviceTypeLabel,
      pricingRuleVersion: bookingCounts.pricingRuleVersion,
      idempotencyKey,
      serviceDates: {
        create: requestedServiceDates.map((item: any, index: number) => ({
          date: item.date,
          startTime: item.startTime ?? null,
          endTime: item.endTime ?? null,
          serviceType: item.serviceType ?? proposal.request.serviceType ?? null,
          serviceTypeLabel: item.serviceTypeLabel ?? proposal.request.serviceTypeLabel ?? null,
          cuisineTypes: item.cuisineTypes ?? proposal.request.cuisineTypes ?? null,
          dietaryRequirements: item.dietaryRequirements ?? proposal.request.dietaryRequirements ?? null,
          adultCount: item.adultCount ?? proposal.request.adultCount ?? null,
          childrenUnder10: item.childrenUnder10 ?? proposal.request.childrenUnder10 ?? null,
          actualAttendeeCount: item.actualAttendeeCount ?? proposal.request.actualAttendeeCount ?? null,
          billableGuestCount: item.billableGuestCount ?? proposal.request.billableGuestCount ?? null,
          pricingGuestCount: item.pricingGuestCount ?? proposal.request.pricingGuestCount ?? null,
          notes: item.notes ?? null,
          sortOrder: item.sortOrder ?? index,
        })),
      },
    },
  })

  for (const slot of availabilitySlots) {
    await tx.availability.update({
      where: { id: slot.id, currentBookings: { lt: tx.availability.fields.maxBookings } },
      data: { currentBookings: { increment: 1 } },
    })
  }

  await tx.proposal.update({ where: { id: proposalId }, data: { status: ProposalStatus.BOOKED } })
  await tx.paymentPlan.update({ where: { id: paymentPlanId }, data: { bookingId: booking.id } })
  await releaseProposalCheckoutLocks(proposalId, tx)
  await ensureAcceptedPricingSnapshot(tx, booking.id)
  await bookingInsuranceService.ensureCoverageForBooking(booking.id, {
    tx,
    qualificationBasis: "PAYMENT_PLAN_PLATFORM_BOOKING_CREATED",
  })
  return booking
}

async function notifyBalanceFailure(paymentPlanId: string, reason: string) {
  const plan = await prisma.paymentPlan.findUnique({
    where: { id: paymentPlanId },
    include: {
      booking: { include: { chef: { select: { userId: true } } } },
      proposal: { include: { request: true } },
    },
  })
  if (!plan) return

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", adminDisabledAt: null, isBanned: false },
    select: { id: true },
    take: 25,
  })
  const notifications = [
    {
      userId: plan.proposal.request.clientId,
      type: "BALANCE_FAILED",
      message: `The remaining balance payment failed. ${reason}`,
    },
    ...(plan.booking?.chef?.userId ? [{
      userId: plan.booking.chef.userId,
      type: "BALANCE_FAILED",
      message: `Balance payment failed for booking ${plan.booking.id}.`,
    }] : []),
    ...admins.map((admin) => ({
      userId: admin.id,
      type: "BALANCE_FAILED",
      message: `Balance payment failed for payment plan ${paymentPlanId}.`,
    })),
  ]

  await prisma.notification.createMany({ data: notifications })
}

function getGraceEndsAt(now: Date) {
  return PAYMENT_RECOVERY_GRACE_DAYS > 0 ? addDays(now, PAYMENT_RECOVERY_GRACE_DAYS) : null
}

async function openPaymentRecoveryTicket(paymentPlanId: string, reason: string) {
  const plan = await prisma.paymentPlan.findUnique({
    where: { id: paymentPlanId },
    include: {
      booking: true,
      proposal: { include: { request: { include: { client: true } } } },
    },
  })
  if (!plan) return

  const requester = plan.proposal.request.client
  const existing = await prisma.supportTicket.findFirst({
    where: {
      relatedBookingId: plan.bookingId ?? plan.booking?.id ?? undefined,
      relatedPaymentId: paymentPlanId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      category: "PAYMENT_RECOVERY",
    },
  })
  if (existing) return

  await prisma.supportTicket.create({
    data: {
      requesterId: requester.id,
      requesterRole: requester.role,
      requesterEmail: requester.email,
      category: "PAYMENT_RECOVERY",
      priority: "HIGH",
      relatedBookingId: plan.bookingId ?? plan.booking?.id ?? undefined,
      relatedPaymentId: paymentPlanId,
      subject: "Payment balance recovery required",
      description: `Payment recovery is required for payment plan ${paymentPlanId}. Reason: ${reason}`,
    },
  })
}

async function markPlanRecoveryRequired(input: {
  paymentPlanId: string
  installmentId?: string
  failureCode?: string | null
  failureMessage: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  const graceEndsAt = getGraceEndsAt(now)
  const plan = await prisma.paymentPlan.findUnique({
    where: { id: input.paymentPlanId },
    select: { eventAnchorDate: true },
  })
  const nextRetryAt = plan && !isInsideBalanceFinalRiskWindow({ eventAnchorDate: plan.eventAnchorDate, now })
    ? getNextBalanceRetryAt({ eventAnchorDate: plan.eventAnchorDate, lastAttemptAt: now })
    : null
  await prisma.paymentPlan.update({
    where: { id: input.paymentPlanId },
    data: {
      status: PAYMENT_PLAN_STATUS.RECOVERY_REQUIRED,
      recoveryStatus: nextRetryAt ? "RECOVERY_REQUIRED" : "FINAL_RISK_WINDOW",
      recoveryStartedAt: now,
      supportEscalatedAt: now,
      nextRetryAt,
      graceEndsAt,
      lastFailureCode: input.failureCode ?? undefined,
      lastFailureMessage: input.failureMessage,
    },
  })
  if (input.installmentId) {
    await prisma.paymentInstallment.update({
      where: { id: input.installmentId },
      data: { nextAttemptAt: nextRetryAt },
    })
  }
  await Promise.allSettled([
    notifyBalanceFailure(input.paymentPlanId, input.failureMessage),
    openPaymentRecoveryTicket(input.paymentPlanId, input.failureMessage),
  ])
}

export const paymentPlanService = {
  getEligibilityForProposal(proposal: {
    request: { eventDate: Date; multiDayDates?: Array<{ date: Date }> | null }
  }, now = new Date()) {
    return getPaymentEligibility({
      eventDate: proposal.request.eventDate,
      serviceDates: proposal.request.multiDayDates?.map((item) => item.date) ?? [],
      now,
    })
  },

  async createOrReusePlan(input: {
    proposalId: string
    clientId: string
    planType: string
    splitShares?: SplitShareInput[]
    shareCount?: number
  }) {
    if (!isPlanType(input.planType)) throw new Error("INVALID_PAYMENT_PLAN_TYPE")

    const proposal = await getProposalForPlan(input.proposalId, input.clientId)
    const existing = proposal.paymentPlan
    if (existing) {
      if (existing.planType !== input.planType) {
        throw new Error("PAYMENT_PLAN_ALREADY_SELECTED")
      }
      return existing
    }

    const eligibility = this.getEligibilityForProposal(proposal)
    assertPlanTypeAllowed(input.planType, eligibility.availablePlanTypes)

    const currency = normalizeCurrency(proposal.request.currency || proposal.currency || "GBP")
    const totalAmountMinor = toMinorUnits(proposal.price)
    const planIdempotencyKey = generateIdempotencyKey("PAYMENT_PLAN", input.proposalId, {
      planType: input.planType,
      totalAmountMinor,
    })

    const shareInvites: Array<{ shareId: string; token: string }> = []

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentPlan.create({
        data: {
          proposalId: proposal.id,
          planType: input.planType,
          status: PAYMENT_PLAN_STATUS.PENDING,
          totalAmountMinor,
          paidAmountMinor: 0,
          outstandingAmountMinor: totalAmountMinor,
          currency,
          eventAnchorDate: eligibility.eventAnchorDate,
          deadlineAt: eligibility.deadlineAt,
          balanceDueAt: input.planType === PAYMENT_PLAN_TYPES.DEPOSIT ? eligibility.balanceDueAt : null,
          depositBasisPoints: input.planType === PAYMENT_PLAN_TYPES.DEPOSIT ? STANDARD_DEPOSIT_BASIS_POINTS : null,
          guarantorUserId: input.planType === PAYMENT_PLAN_TYPES.SPLIT_BILL ? input.clientId : null,
          guarantorAcceptedAt: input.planType === PAYMENT_PLAN_TYPES.SPLIT_BILL ? new Date() : null,
          createdBy: input.clientId,
          idempotencyKey: planIdempotencyKey,
          metadata: {
            eligiblePlanTypes: eligibility.availablePlanTypes,
            earliestServiceDateAnchor: eligibility.eventAnchorDate.toISOString(),
            depositPercent: input.planType === PAYMENT_PLAN_TYPES.DEPOSIT ? STANDARD_DEPOSIT_PERCENT : undefined,
            splitBillGuarantor: input.planType === PAYMENT_PLAN_TYPES.SPLIT_BILL ? "MAIN_BOOKING_CLIENT" : undefined,
          },
        },
      })

      if (input.planType === PAYMENT_PLAN_TYPES.FULL_PAYMENT) {
        await tx.paymentInstallment.create({
          data: {
            paymentPlanId: created.id,
            kind: PAYMENT_INSTALLMENT_KIND.FULL,
            amountMinor: totalAmountMinor,
            currency,
            dueAt: new Date(),
            idempotencyKey: generateIdempotencyKey("PAYMENT_INSTALLMENT", created.id, { kind: "FULL" }),
          },
        })
      }

      if (input.planType === PAYMENT_PLAN_TYPES.DEPOSIT) {
        const { depositAmountMinor, balanceAmountMinor } = splitDepositBalance(totalAmountMinor)
        await tx.paymentInstallment.createMany({
          data: [
            {
              paymentPlanId: created.id,
              kind: PAYMENT_INSTALLMENT_KIND.DEPOSIT,
              amountMinor: depositAmountMinor,
              currency,
              dueAt: new Date(),
              idempotencyKey: generateIdempotencyKey("PAYMENT_INSTALLMENT", created.id, { kind: "DEPOSIT" }),
            },
            {
              paymentPlanId: created.id,
              kind: PAYMENT_INSTALLMENT_KIND.BALANCE,
              amountMinor: balanceAmountMinor,
              currency,
              dueAt: eligibility.balanceDueAt,
              idempotencyKey: generateIdempotencyKey("PAYMENT_INSTALLMENT", created.id, { kind: "BALANCE" }),
            },
          ],
        })
      }

      if (input.planType === PAYMENT_PLAN_TYPES.SPLIT_BILL) {
        const shareInputs: SplitShareInput[] = input.splitShares?.length
          ? input.splitShares
          : Array.from({ length: input.shareCount ?? 2 }, () => ({}))
        const explicitAmounts = shareInputs.map((share) => share.amountMinor).filter((amount): amount is number => amount != null)
        const shareAmounts = explicitAmounts.length
          ? explicitAmounts
          : splitEvenly(totalAmountMinor, shareInputs.length)
        if (shareAmounts.length !== shareInputs.length || sumMinorUnits(shareAmounts) !== totalAmountMinor) {
          throw new Error("SPLIT_SHARES_MUST_EQUAL_TOTAL")
        }

        for (let index = 0; index < shareInputs.length; index += 1) {
          const token = generateSecureToken()
          const installment = await tx.paymentInstallment.create({
            data: {
              paymentPlanId: created.id,
              kind: PAYMENT_INSTALLMENT_KIND.SPLIT_SHARE,
              amountMinor: shareAmounts[index],
              currency,
              dueAt: eligibility.deadlineAt,
              idempotencyKey: generateIdempotencyKey("PAYMENT_INSTALLMENT", created.id, { kind: "SPLIT_SHARE", index }),
            },
          })
          const share = await tx.splitBillShare.create({
            data: {
              paymentPlanId: created.id,
              installmentId: installment.id,
              payerName: shareInputs[index].payerName ?? null,
              payerEmail: shareInputs[index].payerEmail ?? null,
              tokenHash: hashSecureToken(token),
              tokenExpiresAt: eligibility.deadlineAt ?? addDays(eligibility.eventAnchorDate, -1),
              amountMinor: shareAmounts[index],
              currency,
              deadlineAt: eligibility.deadlineAt,
              idempotencyKey: generateIdempotencyKey("SPLIT_SHARE", created.id, { index, amountMinor: shareAmounts[index] }),
            },
          })
          shareInvites.push({ shareId: share.id, token })
        }
      }

      return tx.paymentPlan.findUniqueOrThrow({
        where: { id: created.id },
        include: { installments: true, splitShares: true },
      })
    })

    return Object.assign(plan, { shareInvites })
  },

  async getNextCheckoutInstallment(paymentPlanId: string) {
    const plan = await prisma.paymentPlan.findUnique({
      where: { id: paymentPlanId },
      include: { installments: { orderBy: { createdAt: "asc" } }, proposal: { include: { chef: { include: { user: true } }, request: true } } },
    })
    if (!plan) throw new Error("PAYMENT_PLAN_NOT_FOUND")

    const installment = plan.installments.find((item) => {
      if (item.status !== PAYMENT_INSTALLMENT_STATUS.PENDING) return false
      if (plan.planType === PAYMENT_PLAN_TYPES.DEPOSIT) return item.kind === PAYMENT_INSTALLMENT_KIND.DEPOSIT
      return item.kind === PAYMENT_INSTALLMENT_KIND.FULL
    })
    if (!installment) throw new Error("NO_CHECKOUT_INSTALLMENT_AVAILABLE")
    return { plan, installment }
  },

  async attachCheckoutSession(input: {
    installmentId: string
    stripeCheckoutSessionId: string
  }) {
    return prisma.paymentInstallment.update({
      where: { id: input.installmentId },
      data: { stripeCheckoutSessionId: input.stripeCheckoutSessionId },
    })
  },

  async processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const paymentPlanId = session.metadata?.paymentPlanId
    const installmentId = session.metadata?.installmentId
    if (!paymentPlanId || !installmentId) return false

    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null
    if (!paymentIntentId) throw new Error("PAYMENT_INTENT_REQUIRED")
    if (session.payment_status !== "paid") throw new Error("CHECKOUT_SESSION_NOT_PAID")

    await prisma.$transaction(async (tx) => {
      const installment = await tx.paymentInstallment.findUnique({
        where: { id: installmentId },
        include: {
          paymentPlan: {
            include: {
              installments: true,
              proposal: { include: { request: true } },
            },
          },
          splitShare: true,
        },
      })
      if (!installment || installment.paymentPlanId !== paymentPlanId) {
        throw new Error("INSTALLMENT_NOT_FOUND")
      }
      if (session.amount_total != null && session.amount_total !== installment.amountMinor) {
        throw new Error("STRIPE_AMOUNT_MISMATCH")
      }
      if (session.currency && session.currency.toUpperCase() !== installment.currency.toUpperCase()) {
        throw new Error("STRIPE_CURRENCY_MISMATCH")
      }
      if (installment.status === PAYMENT_INSTALLMENT_STATUS.PAID) {
        return
      }

      const installmentClaim = await tx.paymentInstallment.updateMany({
        where: { id: installment.id, status: { not: PAYMENT_INSTALLMENT_STATUS.PAID } },
        data: {
          status: PAYMENT_INSTALLMENT_STATUS.PAID,
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntentId,
          stripeCheckoutSessionId: session.id,
        },
      })
      if (installmentClaim.count === 0) return

      if (installment.splitShare) {
        await tx.splitBillShare.update({
          where: { id: installment.splitShare.id },
          data: {
            status: PAYMENT_INSTALLMENT_STATUS.PAID,
            paidAt: new Date(),
            stripePaymentIntentId: paymentIntentId,
            stripeCheckoutSessionId: session.id,
          },
        })
      }

      const paidAggregate = await tx.paymentInstallment.aggregate({
        where: { paymentPlanId, status: PAYMENT_INSTALLMENT_STATUS.PAID },
        _sum: { amountMinor: true },
      })
      const paidAmountMinor = paidAggregate._sum.amountMinor ?? 0
      const outstandingAmountMinor = Math.max(installment.paymentPlan.totalAmountMinor - paidAmountMinor, 0)
      const fullyPaid = outstandingAmountMinor === 0
      const planStatus = fullyPaid
        ? PAYMENT_PLAN_STATUS.FULLY_PAID
        : installment.kind === PAYMENT_INSTALLMENT_KIND.DEPOSIT
          ? PAYMENT_PLAN_STATUS.DEPOSIT_PAID
          : PAYMENT_PLAN_STATUS.PARTIALLY_PAID

      let bookingId = installment.paymentPlan.bookingId
      if (installment.paymentPlan.planType === PAYMENT_PLAN_TYPES.FULL_PAYMENT) {
        const result = await paymentGuarantee.guaranteePaymentToBooking(
          installment.paymentPlan.proposalId,
          session.id,
          paymentIntentId,
          fromMinorUnits(installment.paymentPlan.totalAmountMinor),
          tx
        )
        if (!result.guaranteed || !result.bookingId) {
          throw new Error(`PAYMENT_GUARANTEE_FAILED:${result.error}`)
        }
        bookingId = result.bookingId
        await ensureAcceptedPricingSnapshot(tx, result.bookingId)
      } else if (installment.paymentPlan.planType === PAYMENT_PLAN_TYPES.DEPOSIT || fullyPaid) {
        const booking = await createPlanBookingWithoutLegacyPayment({
          proposalId: installment.paymentPlan.proposalId,
          paymentPlanId,
          tx,
        })
        bookingId = booking.id
      }

      await tx.paymentPlan.update({
        where: { id: paymentPlanId },
        data: {
          bookingId,
          paidAmountMinor,
          outstandingAmountMinor,
          status: planStatus,
          recoveryStatus: fullyPaid ? null : undefined,
          lastFailureCode: fullyPaid ? null : undefined,
          lastFailureMessage: fullyPaid ? null : undefined,
          nextRetryAt: fullyPaid ? null : undefined,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
          defaultPaymentMethodId: typeof session.payment_intent === "string" ? undefined : undefined,
          futureUseConsentAt: installment.kind === PAYMENT_INSTALLMENT_KIND.DEPOSIT ? new Date() : undefined,
        },
      })

      if (bookingId) {
        const existingLedger = await tx.ledger.findFirst({
          where: {
            bookingId,
            transactionType: "PAYMENT",
            metadata: { contains: `"installmentId":"${installmentId}"` },
          },
        })
        if (!existingLedger) {
          await tx.ledger.create({
            data: {
              transactionType: "PAYMENT",
              amount: fromMinorUnits(installment.amountMinor),
              currency: installment.currency,
              bookingId,
              fromAccount: "CLIENT_STRIPE",
              toAccount: "PLATFORM_HOLDING",
              description: `${installment.kind.replace(/_/g, " ")} payment received`,
              metadata: JSON.stringify({
                paymentPlanId,
                installmentId,
                stripeCheckoutSessionId: session.id,
                stripePaymentIntentId: paymentIntentId,
              }),
              createdBy: "SYSTEM",
            },
          })
        }

        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { chef: { select: { userId: true } } },
        })
        if (booking) {
          const label = installment.kind === PAYMENT_INSTALLMENT_KIND.DEPOSIT
            ? "Deposit paid"
            : installment.paymentPlan.planType === PAYMENT_PLAN_TYPES.SPLIT_BILL && fullyPaid
              ? "Split bill fully paid"
              : installment.kind === PAYMENT_INSTALLMENT_KIND.BALANCE
                ? "Balance paid"
                : "Payment received"
          await tx.notification.createMany({
            data: [
              {
                userId: booking.clientId,
                type: "PAYMENT_SUCCESS",
                message: `${label}: ${fromMinorUnits(installment.amountMinor)} ${installment.currency}.`,
              },
              {
                userId: booking.chef.userId,
                type: "PAYMENT_RECEIVED",
                message: `${label} for booking ${booking.id}.`,
              },
            ],
          })
        }
      } else if (installment.paymentPlan.planType === PAYMENT_PLAN_TYPES.SPLIT_BILL) {
        await tx.notification.create({
          data: {
            userId: installment.paymentPlan.proposal.request.clientId,
            type: fullyPaid ? "SPLIT_BILL_SETTLED" : "SPLIT_SHARE_PAID",
            message: fullyPaid
              ? `Split bill fully settled for ${fromMinorUnits(installment.paymentPlan.totalAmountMinor)} ${installment.paymentPlan.currency}.`
              : `A split bill share of ${fromMinorUnits(installment.amountMinor)} ${installment.currency} was paid.`,
          },
        })
      }
    })

    logger.info("[PAYMENT_PLAN] Checkout session processed", {
      paymentPlanId,
      installmentId,
      sessionId: session.id,
    })
    return true
  },

  async processBalanceDue(now = new Date()) {
    const dueBalances = await prisma.paymentInstallment.findMany({
      where: {
        kind: PAYMENT_INSTALLMENT_KIND.BALANCE,
        status: PAYMENT_INSTALLMENT_STATUS.PENDING,
        dueAt: { lte: now },
        paymentPlan: { status: { in: [PAYMENT_PLAN_STATUS.DEPOSIT_PAID, PAYMENT_PLAN_STATUS.BALANCE_FAILED] } },
      },
      include: {
        paymentPlan: {
          include: {
            booking: { include: { chef: { select: { userId: true } } } },
            proposal: { include: { request: true } },
          },
        },
      },
      take: 50,
    })

    for (const installment of dueBalances) {
      await prisma.paymentPlan.update({
        where: { id: installment.paymentPlanId },
        data: { status: PAYMENT_PLAN_STATUS.BALANCE_DUE },
      })
    }

    return { markedDue: dueBalances.length }
  },

  async markInstallmentFailed(input: {
    stripePaymentIntentId: string
    failureCode?: string | null
    failureMessage?: string | null
  }) {
    const installment = await prisma.paymentInstallment.findUnique({
      where: { stripePaymentIntentId: input.stripePaymentIntentId },
    })
    if (!installment) return false

    await prisma.$transaction([
      prisma.paymentInstallment.update({
        where: { id: installment.id },
        data: {
          status: PAYMENT_INSTALLMENT_STATUS.FAILED,
          failedAt: new Date(),
          lastAttemptAt: new Date(),
          attemptCount: { increment: 1 },
          failureCode: input.failureCode ?? undefined,
          failureMessage: input.failureMessage ?? undefined,
        },
      }),
    ])
    await markPlanRecoveryRequired({
      paymentPlanId: installment.paymentPlanId,
      installmentId: installment.id,
      failureCode: input.failureCode,
      failureMessage: input.failureMessage ?? "Stripe reported the balance payment failed.",
    })
    return true
  },

  async rememberPlanPaymentMethod(paymentIntent: Stripe.PaymentIntent) {
    const paymentPlanId = paymentIntent.metadata?.paymentPlanId
    const installmentId = paymentIntent.metadata?.installmentId
    if (!paymentPlanId) return false

    await prisma.paymentPlan.update({
      where: { id: paymentPlanId },
      data: {
        stripeCustomerId: typeof paymentIntent.customer === "string" ? paymentIntent.customer : undefined,
        defaultPaymentMethodId: typeof paymentIntent.payment_method === "string" ? paymentIntent.payment_method : undefined,
        futureUseConsentAt: installmentId ? new Date() : undefined,
      },
    })
    return true
  },

  async processPlanPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    if (!paymentIntent.metadata?.paymentPlanId || !paymentIntent.metadata?.installmentId) return false
    const installment = await prisma.paymentInstallment.findUnique({
      where: { id: paymentIntent.metadata.installmentId },
    })
    if (!installment || installment.paymentPlanId !== paymentIntent.metadata.paymentPlanId) {
      throw new Error("INSTALLMENT_NOT_FOUND")
    }
    const receivedAmount = paymentIntent.amount_received || paymentIntent.amount
    if (receivedAmount !== installment.amountMinor) {
      throw new Error("STRIPE_AMOUNT_MISMATCH")
    }
    if (paymentIntent.currency.toUpperCase() !== installment.currency.toUpperCase()) {
      throw new Error("STRIPE_CURRENCY_MISMATCH")
    }
    await this.rememberPlanPaymentMethod(paymentIntent)

    return this.processCheckoutSessionCompleted({
      id: `payment_intent:${paymentIntent.id}`,
      metadata: paymentIntent.metadata,
      payment_intent: paymentIntent.id,
      payment_status: "paid",
      customer: paymentIntent.customer,
      amount_total: receivedAmount,
      currency: paymentIntent.currency,
    } as Stripe.Checkout.Session)
  },

  async processSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
    const paymentPlanId = setupIntent.metadata?.paymentPlanId
    if (!paymentPlanId) return false
    if (setupIntent.status !== "succeeded") return false

    await prisma.paymentPlan.update({
      where: { id: paymentPlanId },
      data: {
        stripeCustomerId: typeof setupIntent.customer === "string" ? setupIntent.customer : undefined,
        defaultPaymentMethodId: typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : undefined,
        futureUseConsentAt: new Date(),
        recoveryStatus: "PAYMENT_METHOD_UPDATED",
      },
    })
    return true
  },

  async createPaymentMethodUpdateSession(input: {
    paymentPlanId: string
    clientId: string
    stripe: Stripe
    successUrl: string
    cancelUrl: string
  }) {
    const plan = await prisma.paymentPlan.findUnique({
      where: { id: input.paymentPlanId },
      include: { proposal: { include: { request: true } } },
    })
    if (!plan) throw new Error("PAYMENT_PLAN_NOT_FOUND")
    if (plan.proposal.request.clientId !== input.clientId) throw new Error("FORBIDDEN")
    if (!plan.stripeCustomerId) throw new Error("STRIPE_CUSTOMER_REQUIRED")

    return input.stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["card"],
      customer: plan.stripeCustomerId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        paymentPlanId: plan.id,
        recoveryFlow: "PAYMENT_METHOD_UPDATE",
      },
      setup_intent_data: {
        metadata: {
          paymentPlanId: plan.id,
          recoveryFlow: "PAYMENT_METHOD_UPDATE",
        },
      },
    }, {
      idempotencyKey: generateIdempotencyKey("PAYMENT_METHOD_UPDATE_SESSION", plan.id, {
        clientId: input.clientId,
        status: plan.status,
      }),
    })
  },

  async createBalanceRecoveryCheckout(input: {
    paymentPlanId: string
    clientId: string
    stripe: Stripe
    successUrl: string
    cancelUrl: string
  }) {
    const plan = await prisma.paymentPlan.findUnique({
      where: { id: input.paymentPlanId },
      include: {
        installments: true,
        proposal: { include: { request: { include: { client: true } } } },
      },
    })
    if (!plan) throw new Error("PAYMENT_PLAN_NOT_FOUND")
    if (plan.proposal.request.clientId !== input.clientId) throw new Error("FORBIDDEN")

    const installment = plan.installments.find((item) =>
      [PAYMENT_INSTALLMENT_KIND.BALANCE, PAYMENT_INSTALLMENT_KIND.SPLIT_GUARANTOR_SHORTFALL].includes(item.kind as any)
      && [PAYMENT_INSTALLMENT_STATUS.PENDING, PAYMENT_INSTALLMENT_STATUS.FAILED].includes(item.status as any)
    )
    if (!installment) throw new Error("NO_RECOVERABLE_BALANCE")
    if (installment.amountMinor <= 0 || installment.currency.toUpperCase() !== plan.currency.toUpperCase()) {
      throw new Error("RECOVERY_AMOUNT_INVALID")
    }

    const session = await input.stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: installment.currency.toLowerCase(),
            unit_amount: installment.amountMinor,
            product_data: {
              name: installment.kind === PAYMENT_INSTALLMENT_KIND.SPLIT_GUARANTOR_SHORTFALL
                ? "Split bill outstanding balance"
                : "Booking balance recovery payment",
            },
          },
          quantity: 1,
        },
      ],
      customer: plan.stripeCustomerId ?? undefined,
      customer_email: plan.stripeCustomerId ? undefined : plan.proposal.request.client.email ?? undefined,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        proposalId: plan.proposalId,
        paymentPlanId: plan.id,
        installmentId: installment.id,
        planType: plan.planType,
        installmentKind: installment.kind,
        currency: installment.currency,
        recoveryFlow: "MANUAL_BALANCE_SETTLEMENT",
      },
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: {
          proposalId: plan.proposalId,
          paymentPlanId: plan.id,
          installmentId: installment.id,
          planType: plan.planType,
          installmentKind: installment.kind,
          currency: installment.currency,
          recoveryFlow: "MANUAL_BALANCE_SETTLEMENT",
        },
      },
    }, {
      idempotencyKey: generateIdempotencyKey("BALANCE_RECOVERY_CHECKOUT", installment.id, {
        clientId: input.clientId,
        status: installment.status,
      }),
    })

    await this.attachCheckoutSession({
      installmentId: installment.id,
      stripeCheckoutSessionId: session.id,
    })
    return session
  },

  async chargeDueBalanceInstallment(input: {
    installmentId: string
    stripe: Stripe
    now?: Date
  }) {
    const installment = await prisma.paymentInstallment.findUnique({
      where: { id: input.installmentId },
      include: { paymentPlan: { include: { booking: { include: { chef: { select: { userId: true } } } } } } },
    })
    if (!installment) throw new Error("INSTALLMENT_NOT_FOUND")
    if (installment.kind !== PAYMENT_INSTALLMENT_KIND.BALANCE) throw new Error("INSTALLMENT_NOT_BALANCE")
    if (![PAYMENT_INSTALLMENT_STATUS.PENDING, PAYMENT_INSTALLMENT_STATUS.FAILED].includes(installment.status as any)) {
      return { charged: false, status: installment.status }
    }
    if (isInsideBalanceFinalRiskWindow({
      eventAnchorDate: installment.paymentPlan.eventAnchorDate,
      now: input.now ?? new Date(),
    })) {
      await markPlanRecoveryRequired({
        paymentPlanId: installment.paymentPlanId,
        installmentId: installment.id,
        failureCode: "FINAL_RISK_WINDOW",
        failureMessage: "The balance payment remains unresolved inside the final seven-day event risk window.",
        now: input.now,
      })
      return { charged: false, status: "FINAL_RISK_WINDOW" }
    }
    if (!installment.paymentPlan.stripeCustomerId || !installment.paymentPlan.defaultPaymentMethodId) {
      await prisma.$transaction([
        prisma.paymentInstallment.update({
          where: { id: installment.id },
          data: {
            status: PAYMENT_INSTALLMENT_STATUS.FAILED,
            failedAt: input.now ?? new Date(),
            lastAttemptAt: input.now ?? new Date(),
            failureCode: "PAYMENT_METHOD_REQUIRED",
            failureMessage: "No reusable Stripe payment method is stored for this deposit balance.",
            attemptCount: { increment: 1 },
          },
        }),
      ])
      await markPlanRecoveryRequired({
        paymentPlanId: installment.paymentPlanId,
        installmentId: installment.id,
        failureCode: "PAYMENT_METHOD_REQUIRED",
        failureMessage: "No reusable Stripe payment method is stored for this deposit balance.",
        now: input.now,
      })
      return { charged: false, status: PAYMENT_PLAN_STATUS.RECOVERY_REQUIRED, configurationRequired: true }
    }

    const processingClaim = await prisma.paymentInstallment.updateMany({
      where: {
        id: installment.id,
        status: { in: [PAYMENT_INSTALLMENT_STATUS.PENDING, PAYMENT_INSTALLMENT_STATUS.FAILED] },
      },
      data: { status: PAYMENT_INSTALLMENT_STATUS.PROCESSING, attemptCount: { increment: 1 }, lastAttemptAt: input.now ?? new Date() },
    })
    if (processingClaim.count === 0) {
      return { charged: false, status: "ALREADY_PROCESSING_OR_PAID" }
    }

    const attemptNumber = installment.attemptCount + 1
    const stripeIdempotencyKey = generateIdempotencyKey("BALANCE_ATTEMPT", installment.id, { attemptNumber })

    let paymentIntent: Stripe.PaymentIntent
    try {
      paymentIntent = await input.stripe.paymentIntents.create({
        amount: installment.amountMinor,
        currency: installment.currency.toLowerCase(),
        customer: installment.paymentPlan.stripeCustomerId,
        payment_method: installment.paymentPlan.defaultPaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          proposalId: installment.paymentPlan.proposalId,
          paymentPlanId: installment.paymentPlanId,
          installmentId: installment.id,
          installmentKind: installment.kind,
          attemptNumber: String(attemptNumber),
        },
      }, {
        idempotencyKey: stripeIdempotencyKey,
      })
    } catch (error) {
      const stripeError = error as Stripe.errors.StripeError
      await prisma.paymentInstallment.update({
        where: { id: installment.id },
        data: {
          status: PAYMENT_INSTALLMENT_STATUS.FAILED,
          failedAt: input.now ?? new Date(),
          failureCode: stripeError.code ?? stripeError.type ?? "STRIPE_OFF_SESSION_FAILED",
          failureMessage: stripeError.message ?? "Stripe off-session balance payment failed.",
        },
      })
      await markPlanRecoveryRequired({
        paymentPlanId: installment.paymentPlanId,
        installmentId: installment.id,
        failureCode: stripeError.code ?? stripeError.type,
        failureMessage: stripeError.message ?? "Stripe off-session balance payment failed.",
        now: input.now,
      })
      return { charged: false, status: PAYMENT_PLAN_STATUS.RECOVERY_REQUIRED, error: stripeError.message }
    }

    if (paymentIntent.status !== "succeeded") {
      await prisma.$transaction([
        prisma.paymentInstallment.update({
          where: { id: installment.id },
          data: {
            status: PAYMENT_INSTALLMENT_STATUS.FAILED,
            failedAt: input.now ?? new Date(),
            stripePaymentIntentId: paymentIntent.id,
            failureCode: paymentIntent.status,
            failureMessage: "Stripe balance payment did not succeed.",
          },
        }),
      ])
      await markPlanRecoveryRequired({
        paymentPlanId: installment.paymentPlanId,
        installmentId: installment.id,
        failureCode: paymentIntent.status,
        failureMessage: "Stripe balance payment did not succeed.",
        now: input.now,
      })
      return { charged: false, status: paymentIntent.status, paymentIntentId: paymentIntent.id }
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentInstallment.update({
        where: { id: installment.id },
        data: {
          status: PAYMENT_INSTALLMENT_STATUS.PAID,
          paidAt: input.now ?? new Date(),
          stripePaymentIntentId: paymentIntent.id,
        },
      })
      await tx.paymentPlan.update({
        where: { id: installment.paymentPlanId },
        data: {
          status: PAYMENT_PLAN_STATUS.FULLY_PAID,
          paidAmountMinor: installment.paymentPlan.totalAmountMinor,
          outstandingAmountMinor: 0,
          recoveryStatus: null,
          lastFailureCode: null,
          lastFailureMessage: null,
          nextRetryAt: null,
        },
      })
    })

    const booking = installment.paymentPlan.booking
    if (booking) {
      await ledgerService.recordTransaction({
        transactionType: "PAYMENT",
        amount: fromMinorUnits(installment.amountMinor),
        currency: installment.currency,
        bookingId: booking.id,
        fromAccount: "CLIENT_STRIPE",
        toAccount: "PLATFORM_HOLDING",
        description: "Automatic balance payment received",
        metadata: {
          paymentPlanId: installment.paymentPlanId,
          installmentId: installment.id,
          stripePaymentIntentId: paymentIntent.id,
        },
        createdBy: "SYSTEM",
      })
      await Promise.allSettled([
        prisma.notification.create({
          data: {
            userId: booking.clientId,
            type: "BALANCE_PAID",
            message: `Your remaining balance of ${fromMinorUnits(installment.amountMinor)} ${installment.currency} was paid.`,
          },
        }),
        prisma.notification.create({
          data: {
            userId: booking.chef.userId,
            type: "BALANCE_PAID",
            message: `The remaining balance was paid for booking ${booking.id}.`,
          },
        }),
      ])
    }

    return { charged: true, status: PAYMENT_PLAN_STATUS.FULLY_PAID, paymentIntentId: paymentIntent.id }
  },

  async processSplitBillGuarantorShortfalls(input: {
    stripe: Stripe
    now?: Date
    limit?: number
  }) {
    const now = input.now ?? new Date()
    const plans = await prisma.paymentPlan.findMany({
      where: {
        planType: PAYMENT_PLAN_TYPES.SPLIT_BILL,
        status: { in: [PAYMENT_PLAN_STATUS.PENDING, PAYMENT_PLAN_STATUS.PARTIALLY_PAID, PAYMENT_PLAN_STATUS.RECOVERY_REQUIRED] },
        deadlineAt: { lte: now },
      },
      include: {
        splitShares: true,
        installments: true,
        booking: { include: { chef: { select: { userId: true } } } },
        proposal: { include: { request: true } },
      },
      take: input.limit ?? 25,
      orderBy: { deadlineAt: "asc" },
    })

    const results = []
    for (const plan of plans) {
      if (plan.status === PAYMENT_PLAN_STATUS.RECOVERY_REQUIRED && plan.recoveryStatus !== "PAYMENT_METHOD_UPDATED") {
        results.push({ paymentPlanId: plan.id, charged: false, status: "RECOVERY_ALREADY_REQUIRED" })
        continue
      }

      const unpaidShares = plan.splitShares.filter((share) => share.status !== PAYMENT_INSTALLMENT_STATUS.PAID)
      const shortfallAmountMinor = sumMinorUnits(unpaidShares.map((share) => share.amountMinor))
      if (shortfallAmountMinor <= 0) {
        results.push({ paymentPlanId: plan.id, charged: false, status: "NO_SHORTFALL" })
        continue
      }

      let shortfallInstallment = plan.installments.find((item) => item.kind === PAYMENT_INSTALLMENT_KIND.SPLIT_GUARANTOR_SHORTFALL)
      if (!shortfallInstallment) {
        shortfallInstallment = await prisma.paymentInstallment.create({
          data: {
            paymentPlanId: plan.id,
            kind: PAYMENT_INSTALLMENT_KIND.SPLIT_GUARANTOR_SHORTFALL,
            status: PAYMENT_INSTALLMENT_STATUS.PENDING,
            amountMinor: shortfallAmountMinor,
            currency: plan.currency,
            dueAt: now,
            idempotencyKey: generateIdempotencyKey("SPLIT_GUARANTOR_SHORTFALL", plan.id, { deadlineAt: plan.deadlineAt }),
            metadata: { unpaidShareIds: unpaidShares.map((share) => share.id) },
          },
        })
      }

      if (shortfallInstallment.status === PAYMENT_INSTALLMENT_STATUS.PAID) {
        results.push({ paymentPlanId: plan.id, charged: false, status: "SHORTFALL_ALREADY_PAID" })
        continue
      }

      await prisma.paymentPlan.update({
        where: { id: plan.id },
        data: {
          shortfallAmountMinor,
          recoveryStatus: "SPLIT_GUARANTOR_SHORTFALL_DUE",
        },
      })

      if (!plan.stripeCustomerId || !plan.defaultPaymentMethodId) {
        await markPlanRecoveryRequired({
          paymentPlanId: plan.id,
          failureCode: "GUARANTOR_PAYMENT_METHOD_REQUIRED",
          failureMessage: "Split bill unpaid shares require organizer settlement, but no reusable Stripe payment method is stored.",
          now,
        })
        results.push({ paymentPlanId: plan.id, charged: false, status: PAYMENT_PLAN_STATUS.RECOVERY_REQUIRED })
        continue
      }

      try {
        const paymentIntent = await input.stripe.paymentIntents.create({
          amount: shortfallInstallment.amountMinor,
          currency: shortfallInstallment.currency.toLowerCase(),
          customer: plan.stripeCustomerId,
          payment_method: plan.defaultPaymentMethodId,
          off_session: true,
          confirm: true,
          metadata: {
            proposalId: plan.proposalId,
            paymentPlanId: plan.id,
            installmentId: shortfallInstallment.id,
            installmentKind: PAYMENT_INSTALLMENT_KIND.SPLIT_GUARANTOR_SHORTFALL,
          },
        }, {
          idempotencyKey: shortfallInstallment.idempotencyKey,
        })

        if (paymentIntent.status !== "succeeded") {
          await prisma.paymentInstallment.update({
            where: { id: shortfallInstallment.id },
            data: {
              status: PAYMENT_INSTALLMENT_STATUS.FAILED,
              failedAt: now,
              stripePaymentIntentId: paymentIntent.id,
              failureCode: paymentIntent.status,
              failureMessage: "Split bill guarantor shortfall charge did not succeed.",
              attemptCount: { increment: 1 },
              lastAttemptAt: now,
            },
          })
          await markPlanRecoveryRequired({
            paymentPlanId: plan.id,
            failureCode: paymentIntent.status,
            failureMessage: "Split bill guarantor shortfall charge did not succeed.",
            now,
          })
          results.push({ paymentPlanId: plan.id, charged: false, status: paymentIntent.status, paymentIntentId: paymentIntent.id })
          continue
        }

        await this.processPlanPaymentIntentSucceeded(paymentIntent)
        await prisma.paymentPlan.update({
          where: { id: plan.id },
          data: {
            shortfallChargedAt: now,
            recoveryStatus: "SPLIT_GUARANTOR_SHORTFALL_PAID",
          },
        })
        await prisma.splitBillShare.updateMany({
          where: {
            paymentPlanId: plan.id,
            status: { not: PAYMENT_INSTALLMENT_STATUS.PAID },
          },
          data: { status: "GUARANTOR_SETTLED" },
        })
        if (plan.booking) {
          await prisma.notification.createMany({
            data: [
              {
                userId: plan.proposal.request.clientId,
                type: "SPLIT_SHORTFALL_PAID",
                message: `Unpaid split bill shares of ${fromMinorUnits(shortfallAmountMinor)} ${plan.currency} were settled by the booking organizer.`,
              },
              {
                userId: plan.booking.chef.userId,
                type: "SPLIT_SHORTFALL_PAID",
                message: `Split bill shortfall was settled for booking ${plan.booking.id}.`,
              },
            ],
          })
        }
        results.push({ paymentPlanId: plan.id, charged: true, status: PAYMENT_PLAN_STATUS.FULLY_PAID, paymentIntentId: paymentIntent.id })
      } catch (error) {
        const stripeError = error as Stripe.errors.StripeError
        await prisma.paymentInstallment.update({
          where: { id: shortfallInstallment.id },
          data: {
            status: PAYMENT_INSTALLMENT_STATUS.FAILED,
            failedAt: now,
            failureCode: stripeError.code ?? stripeError.type ?? "SPLIT_SHORTFALL_FAILED",
            failureMessage: stripeError.message ?? "Split bill guarantor shortfall charge failed.",
            attemptCount: { increment: 1 },
            lastAttemptAt: now,
          },
        })
        await prisma.paymentPlan.update({
          where: { id: plan.id },
          data: { shortfallFailedAt: now },
        })
        await markPlanRecoveryRequired({
          paymentPlanId: plan.id,
          failureCode: stripeError.code ?? stripeError.type,
          failureMessage: stripeError.message ?? "Split bill guarantor shortfall charge failed.",
          now,
        })
        results.push({ paymentPlanId: plan.id, charged: false, status: PAYMENT_PLAN_STATUS.RECOVERY_REQUIRED, error: stripeError.message })
      }
    }

    return { attempted: plans.length, results }
  },

  async processDueBalanceCharges(input: {
    stripe: Stripe
    now?: Date
    limit?: number
  }) {
    const now = input.now ?? new Date()
    await this.processBalanceDue(now)
    const dueBalances = await prisma.paymentInstallment.findMany({
      where: {
        kind: PAYMENT_INSTALLMENT_KIND.BALANCE,
        status: { in: [PAYMENT_INSTALLMENT_STATUS.PENDING, PAYMENT_INSTALLMENT_STATUS.FAILED] },
        dueAt: { lte: now },
        paymentPlan: {
          status: { in: [PAYMENT_PLAN_STATUS.DEPOSIT_PAID, PAYMENT_PLAN_STATUS.BALANCE_DUE, PAYMENT_PLAN_STATUS.BALANCE_FAILED, PAYMENT_PLAN_STATUS.RECOVERY_REQUIRED] },
        },
      },
      take: input.limit ?? 25,
      orderBy: { dueAt: "asc" },
      include: { paymentPlan: { include: { booking: { select: { status: true } } } } },
    })

    const results = []
    const shortfallResults = await this.processSplitBillGuarantorShortfalls({
      stripe: input.stripe,
      now,
      limit: input.limit,
    })
    for (const installment of dueBalances) {
      if (installment.paymentPlan.booking && ["CANCELLED", "REFUNDED"].includes(installment.paymentPlan.booking.status)) {
        results.push({
          installmentId: installment.id,
          charged: false,
          status: "BOOKING_NOT_ELIGIBLE_FOR_RETRY",
        })
        continue
      }

      if (isInsideBalanceFinalRiskWindow({ eventAnchorDate: installment.paymentPlan.eventAnchorDate, now })) {
        await markPlanRecoveryRequired({
          paymentPlanId: installment.paymentPlanId,
          installmentId: installment.id,
          failureCode: "FINAL_RISK_WINDOW",
          failureMessage: "The balance payment remains unresolved inside the final seven-day event risk window.",
          now,
        })
        results.push({
          installmentId: installment.id,
          charged: false,
          status: "FINAL_RISK_WINDOW",
        })
        continue
      }

      const canRetryFailedInstallment = installment.status !== PAYMENT_INSTALLMENT_STATUS.FAILED
        || installment.paymentPlan.recoveryStatus === "PAYMENT_METHOD_UPDATED"
        || (installment.nextAttemptAt != null && installment.nextAttemptAt.getTime() <= now.getTime())

      if (!canRetryFailedInstallment) {
        results.push({
          installmentId: installment.id,
          charged: false,
          status: "RECOVERY_REQUIRED_NO_RETRY_POLICY",
        })
        continue
      }

      try {
        results.push({
          installmentId: installment.id,
          ...(await this.chargeDueBalanceInstallment({ installmentId: installment.id, stripe: input.stripe, now })),
        })
      } catch (error) {
        results.push({
          installmentId: installment.id,
          charged: false,
          error: error instanceof Error ? error.message : "Unknown balance charge error",
        })
      }
    }

    return { attempted: dueBalances.length, results, splitBillShortfalls: shortfallResults }
  },

  async ensureSnapshotForBooking(bookingId: string) {
    return prisma.$transaction((tx) => ensureAcceptedPricingSnapshot(tx, bookingId))
  },
}
