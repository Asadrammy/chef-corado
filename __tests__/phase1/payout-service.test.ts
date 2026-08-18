/// <reference types="jest" />

jest.mock("@/lib/repositories/payout-repository", () => ({
  payoutRepository: {
    findChefProfile: jest.fn(),
    getCompletedBookingsWithPayments: jest.fn(),
    getPaidBookingPaymentSummaries: jest.fn(),
    listPayouts: jest.fn(),
    createPayout: jest.fn(),
    findPayoutById: jest.fn(),
  },
}))

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/services/ledger-service", () => ({
  ledgerService: {
    recordPayout: jest.fn(),
  },
}))

jest.mock("@/lib/services/stripe-service", () => ({
  StripeService: {
    isConfigured: jest.fn(),
  },
  getStripeService: jest.fn(),
}))

import { prisma } from "@/lib/prisma"
import { payoutRepository } from "@/lib/repositories/payout-repository"
import { ledgerService } from "@/lib/services/ledger-service"
import { payoutService } from "@/lib/services/payout-service"
import { getStripeService, StripeService } from "@/lib/services/stripe-service"

const mockedPayoutRepository = payoutRepository as unknown as Record<string, jest.Mock>
const mockedPrisma = prisma as unknown as { $transaction: jest.Mock }
const mockedLedgerService = ledgerService as unknown as { recordPayout: jest.Mock }
const mockedStripeServiceClass = StripeService as unknown as { isConfigured: jest.Mock }
const mockedGetStripeService = getStripeService as unknown as jest.Mock

describe("Phase 1 manual payout workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedStripeServiceClass.isConfigured.mockReturnValue(false)
    mockedGetStripeService.mockReturnValue({
      retrieveConnectAccount: jest.fn(),
    })
  })

  it("prevents duplicate active payout requests for the same chef and amount", async () => {
    mockedPayoutRepository.findChefProfile.mockResolvedValue({ id: "chef-1", isApproved: true, preferredCurrency: "GBP" })
    mockedPayoutRepository.getCompletedBookingsWithPayments.mockResolvedValue([
      { payments: { totalAmount: 200, commissionAmount: 40, chefAmount: 160, currency: "GBP", status: "PAID" } },
    ])
    mockedPayoutRepository.getPaidBookingPaymentSummaries.mockResolvedValue([
      {
        id: "booking-1",
        location: "London",
        totalPrice: 200,
        currency: "GBP",
        status: "COMPLETED",
        bookingType: "PROPOSAL",
        eventDate: new Date("2026-09-10T00:00:00.000Z"),
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        serviceTypeLabel: "3-Course Meal",
        payments: {
          totalAmount: 200,
          commissionAmount: 40,
          chefAmount: 160,
          currency: "GBP",
          status: "PAID",
          createdAt: new Date("2026-09-01T00:00:00.000Z"),
        },
        proposal: {
          request: {
            title: "Dinner in London",
            requestMode: "STANDARD",
            serviceTypeLabel: "3-Course Meal",
            countryCode: "GB",
          },
        },
      },
    ])
    mockedPayoutRepository.listPayouts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "payout-existing" }])

    await expect(payoutService.createPayout("user-1", 100, "GBP")).rejects.toThrow("DUPLICATE_ACTIVE_PAYOUT")
    expect(mockedPayoutRepository.listPayouts).toHaveBeenLastCalledWith(expect.objectContaining({
      currency: "GBP",
    }))
  })

  it("requires an external reference before marking a manual payout paid", async () => {
    mockedPayoutRepository.findPayoutById.mockResolvedValue({
      id: "payout-1",
      status: "PROCESSING",
      amount: 100,
      chefId: "chef-1",
      chef: { stripeAccountId: null, stripeOnboardingComplete: false },
    })

    await expect(
      payoutService.updatePayoutStatus("payout-1", { action: "pay", processedBy: "admin-1" })
    ).rejects.toThrow("EXTERNAL_REFERENCE_REQUIRED")
  })

  it("holds a processing payout when Stripe onboarding is not ready", async () => {
    mockedPayoutRepository.findPayoutById.mockResolvedValue({
      id: "payout-1",
      status: "PROCESSING",
      amount: 100,
      chefId: "chef-1",
      chef: { stripeAccountId: null, stripeOnboardingComplete: false },
    })
    const update = jest.fn().mockResolvedValue({ id: "payout-1", status: "ONBOARDING_REQUIRED", amount: 100, chefId: "chef-1" })
    const auditCreate = jest.fn().mockResolvedValue({ id: "audit-1" })
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        payout: {
          findUnique: jest.fn().mockResolvedValue({ id: "payout-1", status: "PROCESSING" }),
          update,
        },
        auditLog: {
          create: auditCreate,
        },
      })
    )

    await expect(
      payoutService.updatePayoutStatus("payout-1", {
        action: "pay",
        externalReference: "bank-ref-123",
        processedBy: "admin-1",
      })
    ).rejects.toThrow("PAYOUT_ONBOARDING_REQUIRED")

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "ONBOARDING_REQUIRED",
        failureReason: "STRIPE_CONNECT_ONBOARDING_REQUIRED",
      }),
    }))
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "PAYOUT_ONBOARDING_REQUIRED" }),
    }))
    expect(mockedLedgerService.recordPayout).not.toHaveBeenCalled()
  })

  it("marks a processing payout paid only after live Stripe Connect readiness is verified", async () => {
    const retrieveConnectAccount = jest.fn().mockResolvedValue({
      details_submitted: true,
      payouts_enabled: true,
    })
    mockedStripeServiceClass.isConfigured.mockReturnValue(true)
    mockedGetStripeService.mockReturnValue({ retrieveConnectAccount })
    mockedPayoutRepository.findPayoutById.mockResolvedValue({
      id: "payout-1",
      status: "PROCESSING",
      amount: 100,
      chefId: "chef-1",
      chef: { stripeAccountId: "acct_ready", stripeOnboardingComplete: true },
    })
    const update = jest.fn().mockResolvedValue({ id: "payout-1", status: "PAID", amount: 100, chefId: "chef-1" })
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        payout: {
          findUnique: jest.fn().mockResolvedValue({ id: "payout-1", status: "PROCESSING", amount: 100, chefId: "chef-1" }),
          update,
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({ id: "audit-1" }),
        },
      })
    )

    await expect(
      payoutService.updatePayoutStatus("payout-1", {
        action: "pay",
        externalReference: "bank-ref-123",
        processedBy: "admin-1",
      })
    ).resolves.toMatchObject({ id: "payout-1", status: "PAID" })

    expect(retrieveConnectAccount).toHaveBeenCalledWith("acct_ready")
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PAID" }),
    }))
  })

  it("prevents a stale concurrent paid update from recording a duplicate release", async () => {
    const retrieveConnectAccount = jest.fn().mockResolvedValue({
      details_submitted: true,
      payouts_enabled: true,
    })
    mockedStripeServiceClass.isConfigured.mockReturnValue(true)
    mockedGetStripeService.mockReturnValue({ retrieveConnectAccount })
    mockedPayoutRepository.findPayoutById.mockResolvedValue({
      id: "payout-1",
      status: "PROCESSING",
      amount: 100,
      chefId: "chef-1",
      chef: { stripeAccountId: "acct_ready", stripeOnboardingComplete: true },
    })
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        payout: {
          findUnique: jest.fn().mockResolvedValue({ id: "payout-1", status: "PAID", amount: 100, chefId: "chef-1" }),
          update: jest.fn(),
        },
        auditLog: {
          create: jest.fn(),
        },
      })
    )

    await expect(
      payoutService.updatePayoutStatus("payout-1", {
        action: "pay",
        externalReference: "bank-ref-123",
        processedBy: "admin-1",
      })
    ).rejects.toThrow("INVALID_PAYOUT_TRANSITION:PAID->PAID")

    expect(mockedLedgerService.recordPayout).not.toHaveBeenCalled()
  })
})
