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

import { prisma } from "@/lib/prisma"
import { payoutRepository } from "@/lib/repositories/payout-repository"
import { payoutService } from "@/lib/services/payout-service"

const mockedPayoutRepository = payoutRepository as unknown as Record<string, jest.Mock>
const mockedPrisma = prisma as unknown as { $transaction: jest.Mock }

describe("Phase 1 manual payout workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
    })

    await expect(
      payoutService.updatePayoutStatus("payout-1", { action: "pay", processedBy: "admin-1" })
    ).rejects.toThrow("EXTERNAL_REFERENCE_REQUIRED")
  })

  it("marks a processing payout paid with an external reference", async () => {
    mockedPayoutRepository.findPayoutById.mockResolvedValue({
      id: "payout-1",
      status: "PROCESSING",
      amount: 100,
      chefId: "chef-1",
    })
    mockedPrisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        payout: {
          findUnique: jest.fn().mockResolvedValue({ id: "payout-1", status: "PROCESSING", amount: 100, chefId: "chef-1" }),
          update: jest.fn().mockResolvedValue({ id: "payout-1", status: "PAID", amount: 100, chefId: "chef-1" }),
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
  })
})
