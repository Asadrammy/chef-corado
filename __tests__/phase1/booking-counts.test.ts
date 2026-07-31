/// <reference types="jest" />

import { getProposalBookingCounts, validateExperienceBookingCounts } from "@/lib/booking-counts"

describe("Phase 1 booking count rules", () => {
  it("preserves a 10-guest proposal booking count", () => {
    expect(getProposalBookingCounts({ guestCount: 10, eventType: "Birthday" })).toEqual({
      guestCount: 10,
      studentCount: null,
    })
  })

  it("preserves a 1-guest proposal booking count", () => {
    expect(getProposalBookingCounts({ guestCount: 1, eventType: "Private Dinner" })).toEqual({
      guestCount: 1,
      studentCount: null,
    })
  })

  it("uses student count for cooking-class proposal requests", () => {
    expect(getProposalBookingCounts({ guestCount: 8, studentCount: 6, eventType: "Cooking Class" })).toEqual({
      guestCount: 8,
      studentCount: 6,
    })
  })

  it("prices cooking classes with pricePerStudent times selected students", () => {
    expect(
      validateExperienceBookingCounts(
        { serviceType: "COOKING_CLASS", minGuests: 2, maxGuests: 12, price: 150, pricePerStudent: 45 },
        4
      )
    ).toEqual({
      guestCount: 4,
      studentCount: 4,
      unitPrice: 45,
      totalPrice: 180,
    })
  })

  it("preserves instant dining selected guest count", () => {
    expect(
      validateExperienceBookingCounts(
        { serviceType: "DINING", minGuests: 1, maxGuests: 20, price: 120 },
        7
      )
    ).toEqual({
      guestCount: 7,
      studentCount: null,
      unitPrice: 120,
      totalPrice: 840,
    })
  })

  it("rejects invalid request fallback counts instead of defaulting to one", () => {
    expect(() => getProposalBookingCounts({ guestCount: 0, eventType: "Private Dinner" })).toThrow("INVALID_REQUEST_GUEST_COUNT")
  })

  it("enforces cooking-class min/max student limits server-side", () => {
    expect(() =>
      validateExperienceBookingCounts(
        { serviceType: "COOKING_CLASS", minGuests: 2, maxGuests: 6, pricePerStudent: 40 },
        1
      )
    ).toThrow("MINIMUM_COUNT_REQUIRED")

    expect(() =>
      validateExperienceBookingCounts(
        { serviceType: "COOKING_CLASS", minGuests: 2, maxGuests: 6, pricePerStudent: 40 },
        7
      )
    ).toThrow("MAXIMUM_COUNT_EXCEEDED")
  })
})
