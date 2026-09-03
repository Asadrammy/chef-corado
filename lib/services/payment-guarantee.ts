/**
 * Payment Guarantee System
 * 
 * Ensures money-safe consistency across:
 * Frontend -> Backend -> Stripe -> Database
 * 
 * Guarantees:
 * - No payment success without booking creation
 * - No booking exists without confirmed payment
 * - Atomic transaction or equivalent guarantee
 * - Retry-safe handling
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { generateIdempotencyKey } from '@/lib/utils/idempotency'
import { getProposalBookingCounts } from '@/lib/booking-counts'
import { assertProposalMeetsActivePricingRule } from '@/lib/services/pricing-rule-service'
import { marketConfigurationService } from '@/lib/services/market-configuration-service'
import { bookingInsuranceService } from '@/lib/services/booking-insurance-service'
import {
  findBlockingProposalCheckoutLocks,
  releaseProposalCheckoutLocks,
} from '@/lib/services/proposal-checkout-locks'
import {
  getAvailabilityLockIds,
  getBlockingAvailabilityStatus,
  getChefDateAvailabilityStatuses,
  incrementExplicitAvailabilityBookingCounts,
} from '@/lib/services/default-availability'
import { BookingStatus, PaymentStatus, ProposalStatus } from '@/types'

export interface PaymentGuaranteeResult {
  guaranteed: boolean
  bookingId?: string
  paymentId?: string
  error?: string
  requiresRetry?: boolean
}

export class PaymentGuarantee {
  /**
   * Atomic payment-to-booking guarantee
   * 
   * This is the CRITICAL function that ensures money safety.
   * It must be called within a database transaction.
   */
  static async guaranteePaymentToBooking(
    proposalId: string,
    stripeSessionId: string | null,
    paymentIntentId: string,
    amount: number,
    tx: any
  ): Promise<PaymentGuaranteeResult> {
    try {
      // Step 1: Verify proposal is in payable state
      const proposal = await tx.proposal.findUnique({
        where: { id: proposalId },
        include: {
          request: { include: { multiDayDates: true } },
          chef: { include: { user: true } },
        },
      })

      if (!proposal) {
        return { guaranteed: false, error: 'Proposal not found' }
      }

      if (!['ACCEPTED', 'ACCEPTED_PENDING_PAYMENT'].includes(proposal.status)) {
        return { guaranteed: false, error: `Proposal not payable: ${proposal.status}` }
      }

      await marketConfigurationService.assertPaymentMarketEnabled(proposal.request.countryCode)

      // 🔴 P0 FIX #2 & #3: CAPACITY CHECK + ATOMIC BOOKING
      // Check and update availability atomically to prevent overbooking
      // IMPORTANT: Use pessimistic locking with FOR UPDATE
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
      const requestedDates = requestedServiceDates.map((item: { date: Date }) => item.date)

      // Step 2: Check if booking already exists (idempotency)
      const existingBooking = await tx.booking.findFirst({
        where: { proposalId },
        include: { payments: true },
      })

      if (existingBooking) {
        // Verify payment exists and is PAID
        if (existingBooking.payments?.status === PaymentStatus.PAID) {
          logger.info('[PAYMENT_GUARANTEE] Booking already exists and paid', {
            bookingId: existingBooking.id,
            paymentId: existingBooking.payments.id,
          })
          await releaseProposalCheckoutLocks(proposalId, tx)
          return {
            guaranteed: true,
            bookingId: existingBooking.id,
            paymentId: existingBooking.payments.id,
          }
        } else {
          return { guaranteed: false, error: 'Booking exists but payment not confirmed' }
        }
      }

      const availabilityStatuses = await getChefDateAvailabilityStatuses(tx, proposal.chefId, requestedDates)
      const blockedAvailability = getBlockingAvailabilityStatus(availabilityStatuses)
      if (blockedAvailability) {
        return { guaranteed: false, error: `Slot no longer available for ${blockedAvailability.dateKey}` }
      }
      const availabilityLockIds = getAvailabilityLockIds(availabilityStatuses)

      const blockingLocks = await findBlockingProposalCheckoutLocks({
        proposalId,
        availabilityIds: availabilityLockIds,
        tx,
      })

      if (blockingLocks.length) {
        return { guaranteed: false, error: 'Selected date is reserved by another active checkout' }
      }

      // Step 3: Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(
        'PROPOSAL_PAYMENT',
        paymentIntentId,
        { proposalId, amount }
      )

      // Step 4: 🔴 P0 FIX #3: FULL ATOMIC TRANSACTION
      // Create booking, payment, update availability, and update proposal in ONE transaction
      const bookingCounts = getProposalBookingCounts(proposal.request)
      const currency = proposal.request.currency || 'GBP'
      const finance = await marketConfigurationService.calculateFinancials({
        grossAmount: amount,
        countryCode: proposal.request.countryCode,
        currency,
      })

      // ATOMIC: Create booking AND payment together
      const booking = await tx.booking.create({
        data: {
          clientId: proposal.request.clientId,
          chefId: proposal.chefId,
          proposalId: proposal.id,
          totalPrice: amount,
          currency,
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
          bookingType: 'PROPOSAL',
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

      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          totalAmount: amount,
          commissionAmount: finance.platformCommissionAmount,
          chefAmount: finance.chefNetPayout,
          platformCommissionRate: finance.platformCommissionRate,
          serviceChargeTaxRate: finance.serviceChargeTaxRate,
          serviceChargeTaxAmount: finance.serviceChargeTaxAmount,
          serviceChargeTaxDeductionEnabled: finance.serviceChargeTaxDeductionEnabled,
          totalPlatformDeduction: finance.totalPlatformDeduction,
          taxJurisdiction: finance.taxJurisdiction,
          serviceChargeTaxStatus: finance.serviceChargeTaxStatus,
          currency,
          status: PaymentStatus.PAID,
          stripePaymentIntentId: paymentIntentId,
          stripeCheckoutSessionId: stripeSessionId ?? undefined,
          idempotencyKey,
        },
      })

      await incrementExplicitAvailabilityBookingCounts(tx, availabilityStatuses)

      // ATOMIC: Update proposal status
      await tx.proposal.update({
        where: { id: proposalId },
        data: { status: ProposalStatus.BOOKED },
      })

      await releaseProposalCheckoutLocks(proposalId, tx)
      await bookingInsuranceService.ensureCoverageForBooking(booking.id, {
        tx,
        qualificationBasis: 'PROPOSAL_CHECKOUT_PAID_PLATFORM_BOOKING',
      })

      logger.info('[PAYMENT_GUARANTEE] Payment and booking created atomically', {
        bookingId: booking.id,
        paymentId: payment.id,
        proposalId,
        amount,
        availabilityIds: availabilityLockIds,
      })

      return {
        guaranteed: true,
        bookingId: booking.id,
        paymentId: payment.id,
      }

    } catch (error) {
      logger.error('[PAYMENT_GUARANTEE] Atomic operation failed', {
        proposalId,
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        guaranteed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresRetry: true,
      }
    }
  }

  /**
   * Verify payment-booking consistency
   * 
   * Used to verify system integrity and detect inconsistencies
   */
  static async verifyPaymentBookingConsistency(
    bookingId: string
  ): Promise<{ consistent: boolean; issues: string[] }> {
    const issues: string[] = []

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { payments: true, proposal: true },
      })

      if (!booking) {
        return { consistent: false, issues: ['Booking not found'] }
      }

      // Check 1: Booking must have payment
      if (!booking.payments) {
        if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.COMPLETED) {
          issues.push(`Booking ${booking.status} has no payment`)
        }
      } else {
        // Check 2: Payment must be PAID for confirmed bookings
        if (booking.status === BookingStatus.CONFIRMED && booking.payments.status !== PaymentStatus.PAID) {
          issues.push(`Confirmed booking has payment status ${booking.payments.status}`)
        }

        // Check 3: Payment amount must match booking
        if (booking.payments.totalAmount !== booking.totalPrice) {
          issues.push(
            `Payment amount ${booking.payments.totalAmount} doesn't match booking price ${booking.totalPrice}`
          )
        }
      }

      // Check 4: Proposal status consistency
      if (booking.proposal && booking.status === BookingStatus.CONFIRMED) {
        if (booking.proposal.status !== ProposalStatus.BOOKED) {
          issues.push(`Confirmed booking has proposal status ${booking.proposal.status}`)
        }
      }

      return {
        consistent: issues.length === 0,
        issues,
      }

    } catch (error) {
      return {
        consistent: false,
        issues: [error instanceof Error ? error.message : 'Verification error'],
      }
    }
  }

  /**
   * Validate proposal is ready for payment
   * 
   * Frontend should call this before creating checkout
   */
  static async validateProposalForPayment(
    proposalId: string,
    clientId: string
  ): Promise<{ valid: boolean; error?: string; proposal?: any }> {
    try {
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          request: true,
          chef: { include: { user: true } },
        },
      })

      if (!proposal) {
        return { valid: false, error: 'Proposal not found' }
      }

      if (proposal.request.clientId !== clientId) {
        return { valid: false, error: 'Unauthorized' }
      }

      // CRITICAL: Only allow payment for these states
      const payableStates = ['ACCEPTED', 'ACCEPTED_PENDING_PAYMENT']
      if (!payableStates.includes(proposal.status)) {
        return { valid: false, error: `Proposal not payable: ${proposal.status}` }
      }

      try {
        await marketConfigurationService.assertPaymentMarketEnabled(proposal.request.countryCode)
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Marketplace payments are not active for this request country',
        }
      }

      // Check if proposal is expired
      if (proposal.expiresAt && new Date() > proposal.expiresAt) {
        return { valid: false, error: 'Proposal expired' }
      }

      try {
        await assertProposalMeetsActivePricingRule({
          request: proposal.request,
          proposalPrice: proposal.price,
        })
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Pricing rule validation failed',
        }
      }

      // Check if already booked
      const existingBooking = await prisma.booking.findFirst({
        where: { proposalId },
      })

      if (existingBooking) {
        return { valid: false, error: 'Proposal already booked' }
      }

      return { valid: true, proposal }

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation error',
      }
    }
  }

  /**
   * Handle payment failure - rollback any partial state
   */
  static async handlePaymentFailure(
    proposalId: string,
    reason: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Find any partial booking
        const booking = await tx.booking.findFirst({
          where: { proposalId },
          include: {
            serviceDates: true,
            proposal: {
              include: {
                request: { include: { multiDayDates: true } },
              },
            },
          },
        })

        if (booking) {
          const datesToRelease = booking.serviceDates.length
            ? booking.serviceDates.map((date: { date: Date }) => date.date)
            : booking.proposal?.request?.multiDayDates?.length
              ? booking.proposal.request.multiDayDates.map((date: { date: Date }) => date.date)
              : [booking.eventDate]

          // Delete the booking (it shouldn't exist without payment)
          await tx.booking.delete({
            where: { id: booking.id },
          })

          // Release availability slot if applicable
          if (booking.proposalId) {
            await tx.availability.updateMany({
              where: {
                chefId: booking.chefId,
                date: { in: datesToRelease },
                currentBookings: { gt: 0 },
              },
              data: {
                currentBookings: { decrement: 1 },
              },
            })
          }
        }

        // Update proposal back to ACCEPTED if it was changed
        await tx.proposal.update({
          where: { id: proposalId },
          data: { status: ProposalStatus.ACCEPTED },
        })

        logger.warn('[PAYMENT_GUARANTEE] Payment failure handled', {
          proposalId,
          reason,
        })
      })

    } catch (error) {
      logger.error('[PAYMENT_GUARANTEE] Failed to handle payment failure', {
        proposalId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * System-wide consistency check
   * 
   * Run periodically to detect system inconsistencies
   */
  static async performSystemConsistencyCheck(): Promise<{
    totalBookings: number
    consistentBookings: number
    inconsistentBookings: number
    issues: Array<{ bookingId: string; issues: string[] }>
  }> {
    const bookings = await prisma.booking.findMany({
      include: { payments: true, proposal: true },
    })

    const issues: Array<{ bookingId: string; issues: string[] }> = []
    let consistentCount = 0

    for (const booking of bookings) {
      const check = await this.verifyPaymentBookingConsistency(booking.id)
      
      if (check.consistent) {
        consistentCount++
      } else {
        issues.push({
          bookingId: booking.id,
          issues: check.issues,
        })
      }
    }

    return {
      totalBookings: bookings.length,
      consistentBookings: consistentCount,
      inconsistentBookings: bookings.length - consistentCount,
      issues,
    }
  }
}

export const paymentGuarantee = PaymentGuarantee
