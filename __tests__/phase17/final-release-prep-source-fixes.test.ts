import fs from "fs"
import path from "path"

import {
  getChefDateAvailabilityStatus,
  getDefaultAvailabilityLockId,
} from "@/lib/services/default-availability"
import { evaluateHighIntent, getHighIntentThreshold } from "@/lib/request-priority"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

function txFor(input: {
  slots?: Array<{
    id: string
    startTime?: string
    endTime?: string
    isAvailable: boolean
    currentBookings: number
    maxBookings: number
  }>
  activeBookings?: number
}) {
  return {
    availability: {
      findMany: jest.fn().mockResolvedValue((input.slots ?? []).map((slot) => ({
        startTime: "09:00",
        endTime: "23:59",
        ...slot,
      }))),
      fields: { maxBookings: "maxBookings" },
    },
    booking: {
      count: jest.fn().mockResolvedValue(input.activeBookings ?? 0),
    },
  }
}

describe("final release preparation source fixes", () => {
  afterEach(() => {
    delete process.env.CHEFACHEF_HIGH_INTENT_THRESHOLD
  })

  it("treats missing availability rows as available while exposing a deterministic default-date lock", async () => {
    const tx = txFor({})
    const status = await getChefDateAvailabilityStatus(tx, "chef-1", new Date("2026-09-20T18:00:00.000Z"))

    expect(status.available).toBe(true)
    expect(status.reason).toBeNull()
    expect(status.lockIds).toEqual([getDefaultAvailabilityLockId("chef-1", "2026-09-20")])
  })

  it("blocks explicit unavailable rows, full explicit slots, and default-date booking conflicts", async () => {
    await expect(getChefDateAvailabilityStatus(txFor({
      slots: [{ id: "slot-blocked", isAvailable: false, currentBookings: 0, maxBookings: 0 }],
    }), "chef-1", "2026-09-20")).resolves.toMatchObject({
      available: false,
      reason: "EXPLICIT_UNAVAILABLE",
    })

    await expect(getChefDateAvailabilityStatus(txFor({
      slots: [{ id: "slot-full", isAvailable: true, currentBookings: 1, maxBookings: 1 }],
    }), "chef-1", "2026-09-20")).resolves.toMatchObject({
      available: false,
      reason: "FULL_CAPACITY",
    })

    await expect(getChefDateAvailabilityStatus(txFor({ activeBookings: 1 }), "chef-1", "2026-09-20")).resolves.toMatchObject({
      available: false,
      reason: "BOOKING_CONFLICT",
    })
  })

  it("wires checkout and payment finalization through the default availability helper", () => {
    expect(read("app/api/payments/checkout/route.ts")).toContain("getChefDateAvailabilityStatuses")
    expect(read("lib/services/payment-guarantee.ts")).toContain("incrementExplicitAvailabilityBookingCounts")
    expect(read("lib/services/payment-plan-service.ts")).toContain("getAvailabilityLockIds")
    expect(read("lib/services/booking-service.ts")).toContain("getChefDateAvailabilityStatus")
    expect(read("app/api/bookings/instant/payment-atomic/route.ts")).toContain("TransactionIsolationLevel.Serializable")
  })

  it("keeps the request wizard from publishing on pre-final keyboard submits", () => {
    const wizard = read("components/request-wizard-form.tsx")

    expect(wizard).toContain("if (stepIndex < steps.length - 1)")
    expect(wizard).toContain("nextStep()")
    expect(wizard).toContain("return")
  })

  it("keeps high-intent scoring centralized and configurable without fake phone signals", () => {
    process.env.CHEFACHEF_HIGH_INTENT_THRESHOLD = "60"

    const result = evaluateHighIntent({
      now: new Date("2026-09-03T12:00:00.000Z"),
      request: {
        eventDate: "2026-09-12T18:00:00.000Z",
        location: "SW1A 1AA",
        countryCode: "GB",
        cuisineTypes: JSON.stringify(["Italian"]),
        dietaryRequirements: JSON.stringify(["Nut allergy"]),
        serviceSpecificAnswers: JSON.stringify({ kitchen: "Domestic kitchen" }),
        budget: 800,
        guestCount: 8,
        client: { verified: true },
      },
    })

    expect(getHighIntentThreshold()).toBe(60)
    expect(result.threshold).toBe(60)
    expect(result.internalReasons.join(" ")).not.toMatch(/phone|whatsapp/i)
  })

  it("keeps geocoding reconciliation dry-run first and owner-gated for writes", () => {
    const script = read("scripts/reconcile-geocoding.cjs")

    expect(script).toContain("mode: writeMode ? \"write\" : \"dry-run\"")
    expect(script).toContain("--owner-approved")
    expect(script).toContain("GOOGLE_GEOCODING_API_KEY")
    expect(script).toContain("Refusing geocoding writes without --owner-approved")
    expect(script).toContain("Refusing approximate production geocoding write")
  })

  it("provides an internal no-PII eligibility diagnostic", () => {
    const diagnostic = read("lib/services/request-eligibility-diagnostic.ts")

    expect(diagnostic).toContain("buildChefRequestEligibilityDiagnostic")
    expect(diagnostic).toContain("certificate/compliance")
    expect(diagnostic).toContain("24h early access")
    expect(diagnostic).toContain("quote cap")
    expect(diagnostic).not.toContain("email: true")
  })
})
