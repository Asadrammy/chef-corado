import fs from "fs"
import path from "path"

const mockAvailabilityFindMany = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    availability: {
      findMany: (...args: unknown[]) => mockAvailabilityFindMany(...args),
    },
  },
}))

import { evaluateChefRequestMatch } from "@/lib/chef-request-matching"
import { geocodeAddress } from "@/lib/geo"
import { evaluateHighIntent, getRequestUrgency } from "@/lib/request-priority"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("final remediation implementation contracts", () => {
  beforeEach(() => {
    mockAvailabilityFindMany.mockResolvedValue([])
  })

  it("matches request cuisine against profile-level cuisine fields without requiring menu rows", async () => {
    const result = await evaluateChefRequestMatch(
      {
        id: "request-italian",
        eventDate: new Date("2026-09-12T18:00:00.000Z"),
        latitude: 51.5,
        longitude: -0.12,
        countryCode: "GB",
        cuisineTypes: JSON.stringify(["Italian"]),
        guestCount: 8,
      },
      {
        id: "chef-profile-cuisine",
        userId: "chef-user",
        latitude: 51.51,
        longitude: -0.13,
        radius: 50,
        baseCountryCode: "GB",
        cuisineType: "Italian",
        cuisineTypes: JSON.stringify(["Mediterranean"]),
        user: { name: "Rue" },
        menus: [],
        experiences: [],
      },
      { enforceRadius: true, enforceMarket: true }
    )

    expect(result.eligible).toBe(true)
    expect(result.reasons).not.toContain("CUISINE_MISMATCH")
  })

  it("computes automatic urgent and last-minute request tiers from event date", () => {
    const now = new Date("2026-09-03T12:00:00.000Z")

    expect(getRequestUrgency({ eventDate: "2026-10-08T12:00:00.000Z", now }).isUrgent).toBe(true)
    expect(getRequestUrgency({ eventDate: "2026-10-09T12:00:00.000Z", now }).isUrgent).toBe(false)
    expect(getRequestUrgency({ eventDate: "2026-09-06T00:00:00.000Z", now }).tier).toBe("LAST_MINUTE")
  })

  it("computes high intent from real request evidence without phone or WhatsApp assumptions", () => {
    const result = evaluateHighIntent({
      now: new Date("2026-09-03T12:00:00.000Z"),
      request: {
        eventDate: "2026-09-12T18:00:00.000Z",
        location: "SW1A 1AA London",
        countryCode: "GB",
        cuisineTypes: JSON.stringify(["Italian"]),
        dietaryRequirements: JSON.stringify(["Gluten free"]),
        serviceSpecificAnswers: JSON.stringify({ kitchen: "Domestic kitchen", equipment: "Oven and hob" }),
        budget: 800,
        guestCount: 8,
        client: { verified: true },
      },
    })

    expect(result.qualifiesHighIntent).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(45)
    expect(result.internalReasons.join(" ")).not.toMatch(/phone|whatsapp/i)
  })

  it("uses only the client-provided high intent signals when later-stage evidence is loaded", () => {
    const result = evaluateHighIntent({
      now: new Date("2026-09-03T12:00:00.000Z"),
      request: {
        eventDate: "2026-09-12T18:00:00.000Z",
        location: "SW1A 1AA London",
        countryCode: "GB",
        requestMode: "INSTANT",
        cuisineTypes: JSON.stringify(["Italian"]),
        dietaryRequirements: JSON.stringify(["Nut allergy"]),
        serviceSpecificAnswers: JSON.stringify({ kitchen: "Domestic kitchen" }),
        budget: 800,
        guestCount: 8,
        client: { verified: true, phoneVerified: true, whatsappVerified: true },
        proposals: [
          {
            paymentPlan: {
              planType: "SPLIT_BILL",
              paidAmountMinor: 20000,
              installments: [{ status: "PAID" }],
            },
            messages: [{ id: "message-1" }],
          },
        ],
      },
    })

    expect(result.internalReasons).toEqual(expect.arrayContaining([
      "payment activity",
      "instant book path",
      "dietary or allergy detail",
      "service brief detail",
      "specific cuisine selected",
      "exact UK postcode",
      "event within 2-14 days",
      "verified email",
      "message engagement",
    ]))
    expect(result.internalReasons.join(" ")).not.toMatch(/phone|whatsapp/i)
  })

  it("uses a UK fallback geocoder when external geocoding is not configured", async () => {
    const google = process.env.GOOGLE_GEOCODING_API_KEY
    const mapbox = process.env.MAPBOX_GEOCODING_TOKEN
    delete process.env.GOOGLE_GEOCODING_API_KEY
    delete process.env.MAPBOX_GEOCODING_TOKEN

    try {
      const result = await geocodeAddress("London SW1A 1AA", "GB")

      expect(result?.provider).toBe("local-uk-fallback")
      expect(result?.status).toBe("APPROXIMATE")
      expect(result?.latitude).toBeCloseTo(51.5074, 3)
    } finally {
      if (google) process.env.GOOGLE_GEOCODING_API_KEY = google
      if (mapbox) process.env.MAPBOX_GEOCODING_TOKEN = mapbox
    }
  })

  it("keeps menu image uploads on a chef-only shared storage route", () => {
    const uploadRoute = read("app/api/upload/route.ts")
    const imageUpload = read("components/ui/image-upload.tsx")

    expect(imageUpload).toContain("formData.append('purpose', 'menu')")
    expect(uploadRoute).toContain("purpose === 'menu'")
    expect(uploadRoute).toContain("session.user.role !== 'CHEF'")
    expect(uploadRoute).toContain("DURABLE_IMAGE_STORAGE_NOT_CONFIGURED")
  })

  it("prevents request wizard submit events from publishing before the notes/photo step", () => {
    const wizard = read("components/request-wizard-form.tsx")

    expect(wizard).toContain("if (stepIndex < steps.length - 1)")
    expect(wizard).toContain("nextStep()")
    expect(wizard).toContain("STANDARD_REQUEST_DRAFT_KEY")
    expect(wizard).toContain("uploadRequestPhotos")
  })

  it("wires direct request 48-hour release through create, decline, and queue processing", () => {
    const requestService = read("lib/services/request-service.ts")
    const invitationService = read("lib/services/request-invitation-service.ts")
    const eventQueue = read("lib/services/event-queue-service.ts")
    const access = read("lib/services/direct-request-access.ts")

    expect(access).toContain("DIRECT_REQUEST_EXCLUSIVITY_HOURS = 48")
    expect(requestService).toContain("DIRECT_REQUEST_RELEASE_NOTIFY")
    expect(requestService).toContain("DIRECT_REQUEST_EXCLUSIVITY_MS")
    expect(invitationService).toContain("handleDirectRequestReleaseNotify")
    expect(eventQueue).toContain("handleDirectRequestReleaseNotify")
    expect(eventQueue).toContain("isDirectRequestReleasedToLocalChefs")
  })
})
