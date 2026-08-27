const mockAvailabilityFindMany = jest.fn()
const mockNotificationCreate = jest.fn()
const mockNotificationUpdate = jest.fn()
const mockShouldSendNotification = jest.fn()
const mockSendPreferenceAwareEmail = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    availability: {
      findMany: (...args: unknown[]) => mockAvailabilityFindMany(...args),
    },
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
      update: (...args: unknown[]) => mockNotificationUpdate(...args),
    },
  },
}))

jest.mock("@/lib/notification-preferences", () => ({
  shouldSendNotification: (...args: unknown[]) => mockShouldSendNotification(...args),
}))

jest.mock("@/lib/email", () => ({
  sendPreferenceAwareEmail: (...args: unknown[]) => mockSendPreferenceAwareEmail(...args),
  emailTemplates: {
    newRequestAlert: jest.fn(() => "<p>request</p>"),
    newMultiDayRequestAlert: jest.fn(() => "<p>multiday request</p>"),
  },
}))

jest.mock("@/lib/site-config", () => ({
  getConfiguredAppBaseUrl: () => "https://chefachef.test",
}))

jest.mock("@/lib/notification-schema", () => ({
  buildNotificationCreateData: async (data: unknown) => data,
  buildNotificationUpdateData: async (data: unknown) => data,
  buildNotificationVisibilityWhere: async (userId: string, unreadOnly = false) => ({
    userId,
    deliveryOnly: false,
    ...(unreadOnly ? { isRead: false } : {}),
  }),
}))

import { filterEligibleChefsForRequest, getChefRequestDistanceKm } from "@/lib/chef-request-matching"
import { notifyEligibleChefsAboutRequest } from "@/lib/services/request-notification-service"

describe("chef request matching and notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAvailabilityFindMany.mockResolvedValue([])
    mockShouldSendNotification.mockResolvedValue(true)
    mockSendPreferenceAwareEmail.mockResolvedValue({ success: true })
    mockNotificationUpdate.mockResolvedValue({ id: "notification-1" })
  })

  it("keeps radius matching canonical and excludes outside-radius chefs", async () => {
    const request = {
      id: "request-1",
      requestMode: "STANDARD",
      serviceType: "DINING",
      cuisineTypes: JSON.stringify(["Italian"]),
      eventDate: "2026-08-31T18:00:00.000Z",
      latitude: 51.5072,
      longitude: -0.1276,
      guestCount: 8,
      pricingGuestCount: 8,
      billableGuestCount: 8,
      actualAttendeeCount: 8,
    }

    const exactDistance = getChefRequestDistanceKm(51.5072, -0.1276, 51.5072, -0.1276)
    const chefs = [
      {
        id: "chef-in",
        userId: "chef-user-in",
        latitude: 51.5072,
        longitude: -0.1276,
        radius: exactDistance + 0.1,
        user: { name: "Chef In", email: "in@example.com" },
        experiences: [{ serviceType: "DINING", cuisineType: "Italian", eventType: "Birthday", minGuests: 2, maxGuests: 20 }],
      },
      {
        id: "chef-out",
        userId: "chef-user-out",
        latitude: 55,
        longitude: -3,
        radius: 10,
        user: { name: "Chef Out", email: "out@example.com" },
        experiences: [{ serviceType: "DINING", cuisineType: "Italian", eventType: "Birthday" }],
      },
    ]

    const eligible = await filterEligibleChefsForRequest(request as any, chefs as any)
    expect(eligible.map((chef) => chef.id)).toEqual(["chef-in"])
  })

  it("creates one deduped automatic notification and email per chef/request pair", async () => {
    mockNotificationCreate.mockResolvedValueOnce({ id: "notification-1" })
    mockNotificationCreate.mockRejectedValueOnce(new Error("Unique constraint failed on the fields: (`dedupeKey`)"))

    const request = {
      id: "request-1",
      title: "Birthday dinner",
      eventType: "Birthday",
      requestMode: "STANDARD",
      serviceType: "DINING",
      serviceTypeLabel: "Dining",
      client: { firstName: "Jill", name: "Jill Thompson" },
      location: "London",
      currency: "GBP",
      budget: 1500,
      eventDate: new Date("2026-08-31T18:00:00.000Z"),
      guestCount: 12,
      actualAttendeeCount: 12,
      cuisineTypes: JSON.stringify(["Italian"]),
      dietaryRequirements: JSON.stringify(["Vegetarian"]),
      photos: [],
      multiDayDates: [],
    }

    const chefs = [
      {
        id: "chef-1",
        userId: "chef-user-1",
        user: { name: "Chef One", email: "chef1@example.com" },
      },
    ]

    const first = await notifyEligibleChefsAboutRequest({ request: request as any, chefs: chefs as any })
    const second = await notifyEligibleChefsAboutRequest({ request: request as any, chefs: chefs as any })

    expect(first.chefsNotified).toBe(1)
    expect(second.chefsNotified).toBe(0)
    expect(mockNotificationCreate).toHaveBeenCalledTimes(2)
    expect(mockSendPreferenceAwareEmail).toHaveBeenCalledTimes(1)
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dedupeKey: "NEW_REQUEST:request-1:chef-user-1",
          deliveryOnly: false,
          requestId: "request-1",
        }),
      })
    )
  })
})
