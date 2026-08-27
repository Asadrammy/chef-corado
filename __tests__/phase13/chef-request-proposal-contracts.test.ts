import { buildChefRequestView, buildChefRespondedRequestView, formatChefProposalStatusLabel, getSafeClientGreetingName } from "@/lib/chef-request-view"
import {
  PROPOSAL_MESSAGE_MAX_LENGTH,
  PROPOSAL_MESSAGE_MIN_LENGTH,
  assertProposalMessageLength,
  isProposalMessageLengthValid,
  sanitizeProposalMessage,
} from "@/lib/proposal-message"

describe("chef request and proposal contracts", () => {
  it("builds a chef-facing request view without exposing email or phone", () => {
    const view = buildChefRequestView({
      id: "request-1",
      title: "Birthday dinner",
      eventType: "Birthday",
      requestMode: "STANDARD",
      serviceType: "DINING",
      serviceTypeLabel: "Dining",
      serviceTier: "Classic",
      client: {
        firstName: "Jill",
        name: "Jill Thompson",
        email: "jill@example.com",
        phone: "+441234567890",
      },
      location: "London",
      currency: "GBP",
      budget: 1500,
      eventDate: new Date("2026-08-31T18:00:00.000Z"),
      eventDates: ["2026-08-31"],
      guestCount: 12,
      adultCount: 10,
      childrenUnder10: 2,
      actualAttendeeCount: 12,
      billableGuestCount: 11,
      pricingGuestCount: 11,
      description: "Private dinner",
      details: "Please keep it elegant.",
      cuisineTypes: JSON.stringify(["Italian", "Modern European"]),
      dietaryRequirements: JSON.stringify(["Vegetarian"]),
      serviceSpecificAnswers: JSON.stringify({
        greetingPreference: "Hello Jill",
        platingStyle: "Family style",
      }),
      photos: [],
      multiDayDates: [],
    })

    const serialized = JSON.stringify(view)
    expect(view.clientGreetingName).toBe("Jill")
    expect(view.clientName).toBe("Jill")
    expect(serialized).not.toContain("jill@example.com")
    expect(serialized).not.toContain("+441234567890")
    expect(serialized).toContain("Hello Jill")
  })

  it("uses a safe fallback greeting hierarchy", () => {
    expect(getSafeClientGreetingName({ firstName: "Peter", name: "Peter Smith" })).toBe("Peter")
    expect(getSafeClientGreetingName({ name: "Peter Smith" })).toBe("Peter")
    expect(getSafeClientGreetingName({ name: "client@example.com" })).toBe("Client")
    expect(getSafeClientGreetingName(null)).toBe("Client")
  })

  it("derives a privacy-safe first token when only a full display name exists", () => {
    const view = buildChefRequestView({
      id: "request-2",
      title: "Corporate lunch",
      eventType: "Corporate",
      requestMode: "STANDARD",
      serviceType: "DINING",
      serviceTypeLabel: "Dining",
      client: {
        name: "Michael Thompson",
        email: "michael.thompson@example.com",
        phone: "+447700900123",
      },
      location: "London",
      currency: "GBP",
      budget: 1200,
      eventDate: new Date("2026-08-31T12:00:00.000Z"),
      eventDates: ["2026-08-31"],
      guestCount: 18,
      adultCount: 18,
      childrenUnder10: 0,
      actualAttendeeCount: 18,
      billableGuestCount: 18,
      pricingGuestCount: 18,
      description: "Lunch event",
      details: "Please keep it light.",
      cuisineTypes: ["Modern European"],
      dietaryRequirements: [],
      serviceSpecificAnswers: {},
      photos: [],
      multiDayDates: [],
    })

    const serialized = JSON.stringify(view)
    expect(view.clientGreetingName).toBe("Michael")
    expect(view.clientName).toBe("Michael")
    expect(serialized).not.toContain("Thompson")
    expect(serialized).not.toContain("michael.thompson@example.com")
    expect(serialized).not.toContain("+447700900123")
  })

  it("keeps proposal length enforcement at the new shared maximum", () => {
    expect(isProposalMessageLengthValid("x".repeat(PROPOSAL_MESSAGE_MIN_LENGTH))).toBe(true)
    expect(() => assertProposalMessageLength("short")).toThrow(`PROPOSAL_MESSAGE_TOO_SHORT:${PROPOSAL_MESSAGE_MIN_LENGTH}`)
    expect(() => assertProposalMessageLength("x".repeat(PROPOSAL_MESSAGE_MAX_LENGTH + 1))).toThrow(`PROPOSAL_MESSAGE_TOO_LONG:${PROPOSAL_MESSAGE_MAX_LENGTH}`)
  })

  it("preserves paragraphs while normalizing proposal text", () => {
    expect(sanitizeProposalMessage("Hello\r\nWorld\n\nThanks")).toBe("Hello\nWorld\n\nThanks")
  })

  it("builds a responded request view with safe follow-up details", () => {
    const responded = buildChefRespondedRequestView({
      id: "proposal-1",
      price: 1800,
      currency: "GBP",
      status: "PENDING",
      message: "Happy to follow up.",
      createdAt: new Date("2026-08-25T12:00:00.000Z"),
      request: {
        id: "request-1",
        title: "Birthday dinner",
        eventType: "Birthday",
        requestMode: "STANDARD",
        serviceType: "DINING",
        serviceTypeLabel: "Dining",
        clientId: "client-1",
        client: { firstName: "Jill", name: "Jill Thompson", email: "jill@example.com", phone: "+441234567890" },
        location: "London",
        currency: "GBP",
        budget: 1500,
        eventDate: new Date("2026-08-31T18:00:00.000Z"),
        eventDates: ["2026-08-31"],
        guestCount: 12,
        actualAttendeeCount: 12,
        pricingGuestCount: 12,
        cuisineTypes: ["Italian"],
        dietaryRequirements: [],
        serviceSpecificAnswers: {},
        photos: [],
        multiDayDates: [],
        createdAt: new Date("2026-08-24T12:00:00.000Z"),
      },
    })

    const serialized = JSON.stringify(responded)
    expect(responded.proposal.statusLabel).toBe("Awaiting Client Decision")
    expect(responded.followUpHref).toBe("/dashboard/chef/messages/client-1")
    expect(responded.detailHref).toBe("/dashboard/chef/requests/request-1")
    expect(serialized).not.toContain("jill@example.com")
    expect(serialized).not.toContain("+441234567890")
    expect(formatChefProposalStatusLabel("ACCEPTED_PENDING_PAYMENT")).toBe("Accepted - Payment Pending")
  })
})
