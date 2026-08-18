/// <reference types="jest" />

import {
  formatBudgetMode,
  formatLineItemTotal,
  formatServiceDateSummary,
  formatServiceDatesCompact,
  parseJsonList,
  renderMultiDayEmailDetails,
  renderProposalLineItemsEmail,
} from "@/lib/multi-day-display"

describe("Phase 2 Multi-Day display helpers", () => {
  const dates = [
    {
      date: "2026-08-17T00:00:00.000Z",
      startTime: "18:00",
      serviceTypeLabel: "3-Course Meal",
      cuisineTypes: JSON.stringify(["Italian"]),
      dietaryRequirements: JSON.stringify(["Vegetarian"]),
      adultCount: 4,
      childrenUnder10: 4,
      actualAttendeeCount: 8,
      billableGuestCount: 6,
      budget: 500,
    },
    {
      date: "2026-08-19T00:00:00.000Z",
      startTime: "10:00",
      serviceTypeLabel: "Brunch",
      cuisineTypes: JSON.stringify(["British"]),
      dietaryRequirements: JSON.stringify(["Gluten Free"]),
      adultCount: 3,
      childrenUnder10: 2,
      actualAttendeeCount: 5,
      billableGuestCount: 4,
      budget: 450,
    },
  ]

  it("summarizes non-consecutive selected service dates", () => {
    expect(formatServiceDateSummary(dates)).toContain("2 selected days")
    expect(formatServiceDatesCompact(dates)).toContain("2 service days")
  })

  it("parses structured and legacy list values safely", () => {
    expect(parseJsonList(JSON.stringify(["Italian", "British"]))).toEqual(["Italian", "British"])
    expect(parseJsonList("Italian, British")).toEqual(["Italian", "British"])
    expect(parseJsonList(null)).toEqual([])
  })

  it("formats budget mode and line item totals without assuming GBP-only data", () => {
    expect(formatBudgetMode("PER_DAY")).toBe("Budget per day")
    expect(formatBudgetMode("TOTAL_EVENT")).toBe("Total budget for all days")
    expect(formatLineItemTotal([
      { serviceDate: "2026-08-17", title: "Dinner", price: 500, currency: "EUR" },
      { serviceDate: "2026-08-19", title: "Brunch", price: 450, currency: "EUR" },
    ], null, "EUR")).toContain("950")
  })

  it("renders Multi-Day email detail blocks and proposal line items", () => {
    const requestHtml = renderMultiDayEmailDetails({
      serviceDates: dates,
      currency: "GBP",
      budgetMode: "PER_DAY",
    })
    const proposalHtml = renderProposalLineItemsEmail([
      { serviceDate: "2026-08-17", title: "Dinner", description: "Vegetarian", price: 500, currency: "GBP" },
      { serviceDate: "2026-08-19", title: "Brunch", description: "Gluten free", price: 450, currency: "GBP" },
    ], "GBP")

    expect(requestHtml).toContain("Multi-Day Chef Hire")
    expect(requestHtml).toContain("Vegetarian")
    expect(proposalHtml).toContain("Dinner")
    expect(proposalHtml).toContain("Brunch")
  })
})
