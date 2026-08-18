/// <reference types="jest" />

import { multiDayRequestSchema } from "@/lib/validation-schemas"

function futureDate(daysFromNow: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split("T")[0]
}

function validPayload(overrides: Record<string, unknown> = {}) {
  const dayOne = futureDate(7)
  const dayTwo = futureDate(9)
  return {
    eventType: "Multi-Day Chef Hire",
    serviceType: "THREE_COURSE_MEAL",
    serviceTier: "Casual dining",
    cuisinePreferences: ["Italian"],
    dietaryRequirements: ["Vegetarian"],
    eventDates: [dayOne, dayTwo],
    eventTime: "18:00",
    location: "London",
    country: "GB",
    guestCount: 6,
    adultCount: 4,
    childrenUnder10: 4,
    budgetMode: "PER_DAY",
    defaultDailyBudget: 500,
    budget: 1000,
    dateRequirements: [
      {
        date: dayOne,
        startTime: "18:00",
        serviceType: "THREE_COURSE_MEAL",
        serviceTier: "Casual dining",
        cuisinePreferences: ["Italian", "Vegetarian"],
        dietaryRequirements: ["Vegetarian"],
        adultCount: 4,
        childrenUnder10: 4,
        actualAttendeeCount: 8,
        billableGuestCount: 6,
        pricingGuestCount: 6,
        budget: 500,
        notes: "Vegetarian dinner",
      },
      {
        date: dayTwo,
        startTime: "10:00",
        serviceType: "BRUNCH",
        serviceTier: "Relaxed brunch",
        cuisinePreferences: ["British"],
        dietaryRequirements: ["Gluten Free"],
        adultCount: 3,
        childrenUnder10: 2,
        actualAttendeeCount: 5,
        billableGuestCount: 4,
        pricingGuestCount: 4,
        budget: 450,
        notes: "Gluten-free brunch",
        serviceSpecificAnswers: { servingFormat: "Plated brunch" },
      },
    ],
    ...overrides,
  }
}

describe("Phase 2 Multi-Day request validation", () => {
  it("accepts non-consecutive dates with per-date services, cuisines, dietary needs, guests, and budgets", () => {
    const result = multiDayRequestSchema.safeParse(validPayload())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.eventDates).toHaveLength(2)
      expect(result.data.dateRequirements[0].cuisinePreferences).toEqual(["Italian", "Vegetarian"])
      expect(result.data.dateRequirements[1].serviceType).toBe("BRUNCH")
      expect(result.data.budgetMode).toBe("PER_DAY")
    }
  })

  it("requires at least two selected dates", () => {
    const dayOne = futureDate(7)
    const result = multiDayRequestSchema.safeParse(validPayload({
      eventDates: [dayOne],
      dateRequirements: [validPayload().dateRequirements[0]],
    }))

    expect(result.success).toBe(false)
  })

  it("rejects duplicate dates", () => {
    const dayOne = futureDate(7)
    const payload = validPayload({
      eventDates: [dayOne, dayOne],
      dateRequirements: [
        { ...validPayload().dateRequirements[0], date: dayOne },
        { ...validPayload().dateRequirements[1], date: dayOne },
      ],
    })

    expect(multiDayRequestSchema.safeParse(payload).success).toBe(false)
  })

  it("enforces max three cuisines per selected day", () => {
    const payload = validPayload() as any
    payload.dateRequirements[0].cuisinePreferences = ["Italian", "Indian", "British", "Thai"]

    expect(multiDayRequestSchema.safeParse(payload).success).toBe(false)
  })

  it("requires explicit total budget in total-event mode", () => {
    const result = multiDayRequestSchema.safeParse(validPayload({
      budgetMode: "TOTAL_EVENT",
      defaultDailyBudget: undefined,
      totalBudget: undefined,
    }))

    expect(result.success).toBe(false)
  })

  it("rejects incorrect child billing math", () => {
    const payload = validPayload() as any
    payload.dateRequirements[0].billableGuestCount = 7

    expect(multiDayRequestSchema.safeParse(payload).success).toBe(false)
  })

  it("enforces service-specific questions for each selected day", () => {
    const payload = validPayload() as any
    payload.dateRequirements[0].serviceType = "SHARING_BUFFET"
    payload.dateRequirements[0].serviceTier = "Casual dining"
    payload.dateRequirements[0].serviceSpecificAnswers = {}

    expect(multiDayRequestSchema.safeParse(payload).success).toBe(false)

    payload.dateRequirements[0].serviceSpecificAnswers = { setupDetails: "Buffet table and serving setup needed." }
    expect(multiDayRequestSchema.safeParse(payload).success).toBe(true)
  })
})
