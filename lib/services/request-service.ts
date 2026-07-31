import { calculateDistance, geocodeAddress } from "@/lib/geo"
import { emailTemplates, sendPreferenceAwareEmail } from "@/lib/email"
import { getCurrencyForCountry } from "@/lib/request-options"
import { requestRepository } from "@/lib/repositories/request-repository"
import { formatCurrency } from "@/lib/currency"
import { enforceUserModeration } from "@/lib/security/moderation-guard"
import { enforceClientCompliance } from "@/lib/security/legal-compliance"
import { validatePolicyFields } from "@/lib/security/communication-policy"
import { Role } from "@/types"

const buildRequestTitle = (input: {
  title?: string
  eventType: string
  guestCount: number
  eventDate: string
  location: string
}) => {
  if (input.title?.trim()) {
    return input.title.trim()
  }

  const parsedDate = new Date(input.eventDate)
  const formattedDate = Number.isNaN(parsedDate.getTime())
    ? "upcoming date"
    : parsedDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })

  const attendeeLabel = input.eventType === "Cooking Class" ? "student" : "guest"
  return `${input.eventType} for ${input.guestCount} ${attendeeLabel}${input.guestCount === 1 ? "" : "s"} on ${formattedDate} in ${input.location}`
}

export const requestService = {
  async createRequest(userId: string, input: {
    title?: string
    eventType: string
    cuisinePreferences: string[]
    dietaryRequirements: string[]
    description?: string
    eventDate: string
    eventTime: string
    location: string
    country: string
    guestCount: number
    latitude?: number
    longitude?: number
    budget: number
    details?: string
  }) {
    await enforceUserModeration(userId)
    await enforceClientCompliance(userId)

    validatePolicyFields({
      title: input.title,
      description: input.description,
      location: input.location,
      details: input.details,
    })

    const title = buildRequestTitle({
      title: input.title,
      eventType: input.eventType,
      guestCount: input.guestCount,
      eventDate: input.eventDate,
      location: input.location,
    })
    const currency = getCurrencyForCountry(input.country)
    const coordinates = input.latitude != null && input.longitude != null
      ? {
          latitude: input.latitude,
          longitude: input.longitude,
          provider: "client",
          status: "VERIFIED" as const,
        }
      : await geocodeAddress(input.location, input.country)

    const created = await requestRepository.createRequest({
      clientId: userId,
      title,
      eventType: input.eventType,
      cuisineTypes: JSON.stringify(input.cuisinePreferences),
      dietaryRequirements: JSON.stringify(input.dietaryRequirements),
      description: input.description,
      eventDate: new Date(input.eventDate),
      eventTime: input.eventTime,
      location: input.location,
      countryCode: input.country,
      currency,
      guestCount: input.guestCount,
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      locationCity: coordinates?.city,
      locationRegion: coordinates?.region,
      formattedAddress: coordinates?.formattedAddress,
      geocodingProvider: coordinates?.provider,
      geocodingStatus: coordinates ? "VERIFIED" : "UNAVAILABLE",
      budget: input.budget,
      details: input.details,
    })

    const createdTitle = created.title ?? title

    if (created.latitude != null && created.longitude != null) {
      const matchingChefs = await requestRepository.findApprovedChefsWithCoordinates()

      const eligibleChefs = matchingChefs.filter((chef) => {
        if (chef.latitude == null || chef.longitude == null || chef.radius <= 0) {
          return false
        }

        const distance = calculateDistance(
          created.latitude as number,
          created.longitude as number,
          chef.latitude,
          chef.longitude
        )

        return distance <= chef.radius
      })

      await Promise.allSettled(
        eligibleChefs.map((chef) =>
          sendPreferenceAwareEmail({
            userId: chef.userId,
            topic: "requests",
            email: chef.user.email,
            subject: `New Service Request: ${createdTitle}`,
            html: emailTemplates.newRequest(
              chef.user.name,
              createdTitle,
              created.location,
              Number(formatCurrency(created.budget, created.currency).replace(/[^[\d.,-]]/g, "")) || created.budget
            ),
          })
        )
      )
    }

    return created
  },

  async listRequests(userId: string | undefined | null, role: string | null | undefined) {
    if (!role) {
      throw new Error("UNAUTHORIZED")
    }

    if (role === Role.CLIENT) {
      if (!userId) {
        throw new Error("UNAUTHORIZED")
      }

      return { requests: await requestRepository.listRequestsForClient(userId) }
    }

    if (role === Role.CHEF) {
      if (!userId) {
        throw new Error("UNAUTHORIZED")
      }

      const chefProfile = await requestRepository.findChefProfileByUserId(userId)

      if (!chefProfile) {
        return {
          error: "Chef profile not found. Please create your chef profile first.",
          needsProfile: true,
          requests: [],
          status: 404,
        }
      }

      if (chefProfile.radius <= 0) {
        return {
          error: "Chef service radius is not properly set. Please update your profile.",
          needsLocation: chefProfile.latitude == null || chefProfile.longitude == null,
          needsRadius: chefProfile.radius <= 0,
          requests: [],
          status: 400,
        }
      }

      const allRequests = await requestRepository.listChefMarketplaceRequests(chefProfile.id)
      const filteredRequests = allRequests
        .map((request) => {
          if (
            chefProfile.latitude == null ||
            chefProfile.longitude == null ||
            request.latitude == null ||
            request.longitude == null
          ) {
            return {
              ...request,
              distanceKm: null,
              broaderMatching: true,
            }
          }

          const distance = calculateDistance(
            chefProfile.latitude as number,
            chefProfile.longitude as number,
            request.latitude as number,
            request.longitude as number
          )

          return {
            ...request,
            distanceKm: Math.round(distance * 10) / 10,
          }
        })
        .filter((request) => request.distanceKm == null || request.distanceKm <= chefProfile.radius)

      return { requests: filteredRequests }
    }

    return { requests: await requestRepository.listAllRequests() }
  },
}
