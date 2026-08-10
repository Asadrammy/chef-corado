import { calculateDistance, geocodeAddress } from "@/lib/geo"
import { emailTemplates, sendPreferenceAwareEmail } from "@/lib/email"
import {
  SERVICE_TYPE_REGISTRY_VERSION,
  calculateGuestComposition,
  getCurrencyForCountry,
  getPricingRule,
  getServiceTypeOption,
  getServiceTypeLabel,
  resolvePricingState,
  validateServiceSpecificAnswers,
} from "@/lib/request-options"
import { assertPricingRuleMatchesRequest, findActivePricingRule } from "@/lib/services/pricing-rule-service"
import { requestRepository } from "@/lib/repositories/request-repository"
import { prisma } from "@/lib/prisma"
import { enforceUserModeration } from "@/lib/security/moderation-guard"
import { enforceClientCompliance } from "@/lib/security/legal-compliance"
import { validatePolicyFields } from "@/lib/security/communication-policy"
import { Role } from "@/types"

const toDateKey = (date: Date | string) => new Date(date).toISOString().slice(0, 10)

async function filterChefsWithoutAvailabilityConflicts<T extends { id: string }>(chefs: T[], dates: Array<Date | string>) {
  const uniqueDateKeys = [...new Set(dates.map(toDateKey))]
  if (chefs.length === 0 || uniqueDateKeys.length === 0) return chefs

  const availability = await prisma.availability.findMany({
    where: {
      chefId: { in: chefs.map((chef) => chef.id) },
      date: { in: uniqueDateKeys.map((date) => new Date(date)) },
    },
    select: {
      chefId: true,
      date: true,
      isAvailable: true,
      currentBookings: true,
      maxBookings: true,
    },
  })

  const availabilityByChefDate = new Map(
    availability.map((slot) => [`${slot.chefId}:${toDateKey(slot.date)}`, slot])
  )

  return chefs.filter((chef) =>
    uniqueDateKeys.every((date) => {
      const slot = availabilityByChefDate.get(`${chef.id}:${date}`)
      return !slot || (slot.isAvailable && slot.currentBookings < slot.maxBookings)
    })
  )
}

async function requestHasAvailabilityConflictForChef(chefId: string, dates: Array<Date | string>) {
  const uniqueDateKeys = [...new Set(dates.map(toDateKey))]
  if (uniqueDateKeys.length === 0) return false

  const availability = await prisma.availability.findMany({
    where: {
      chefId,
      date: { in: uniqueDateKeys.map((date) => new Date(date)) },
    },
    select: {
      date: true,
      isAvailable: true,
      currentBookings: true,
      maxBookings: true,
    },
  })

  return availability.some((slot) => !slot.isAvailable || slot.currentBookings >= slot.maxBookings)
}

const buildRequestTitle = (input: {
  title?: string
  eventType: string
  serviceType?: string
  guestCount: number
  actualAttendeeCount?: number
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

  const attendeeLabel = input.serviceType === "COOKING_CLASS" ? "student" : "guest"
  const serviceLabel = input.serviceType ? `${getServiceTypeLabel(input.serviceType)} ` : ""
  const count = input.actualAttendeeCount ?? input.guestCount
  return `${serviceLabel}${input.eventType} for ${count} ${attendeeLabel}${count === 1 ? "" : "s"} on ${formattedDate} in ${input.location}`
}

export const requestService = {
  async createRequest(userId: string, input: {
    title?: string
    eventType: string
    serviceType: string
    cuisinePreferences: string[]
    dietaryRequirements: string[]
    serviceSpecificAnswers?: Record<string, unknown>
    serviceTier?: string
    pricingRuleVersion?: string
    adultCount?: number
    childrenUnder10?: number
    billableGuestCount?: number
    actualAttendeeCount?: number
    pricingGuestCount?: number
    eventDates?: string[]
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

    const guestComposition = calculateGuestComposition({
      adultCount: input.adultCount,
      childrenUnder10: input.childrenUnder10,
      fallbackGuestCount: input.guestCount,
    })

    const serviceConfig = getServiceTypeOption(input.serviceType)
    if (!serviceConfig?.enabled) {
      throw new Error("INVALID_SERVICE_TYPE")
    }

    if (!serviceConfig.supportedCountries.includes(input.country as never)) {
      throw new Error("SERVICE_COUNTRY_NOT_SUPPORTED")
    }

    const missingServiceAnswers = validateServiceSpecificAnswers(input.serviceType, input.serviceSpecificAnswers)
    if (missingServiceAnswers.length > 0) {
      throw new Error(`SERVICE_REQUIRED_QUESTIONS_MISSING:${missingServiceAnswers.map((question) => question.id).join(",")}`)
    }

    const currency = getCurrencyForCountry(input.country)
    const dbPricingRule = await findActivePricingRule({
      serviceType: input.serviceType,
      countryCode: input.country,
      tier: input.serviceTier,
    })
    const registryPricingRule = getPricingRule(input.serviceType, input.country, input.serviceTier)
    const pricingRule = dbPricingRule ?? registryPricingRule
    const pricingState = resolvePricingState({
      serviceType: input.serviceType,
      countryCode: input.country,
      tier: input.serviceTier,
      budget: input.budget,
      activeRule: pricingRule,
    })

    if (pricingRule) {
      assertPricingRuleMatchesRequest({
        rule: pricingRule,
        request: {
          currency,
          pricingGuestCount: guestComposition.pricingGuestCount,
          billableGuestCount: guestComposition.billableGuestCount,
        },
      })
    }

    const title = buildRequestTitle({
      title: input.title,
      eventType: input.eventType,
      serviceType: input.serviceType,
      guestCount: input.guestCount,
      actualAttendeeCount: guestComposition.actualAttendeeCount,
      eventDate: input.eventDate,
      location: input.location,
    })
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
      requestMode: "STANDARD",
      serviceType: input.serviceType,
      serviceTypeLabel: getServiceTypeLabel(input.serviceType),
      serviceTypeVersion: SERVICE_TYPE_REGISTRY_VERSION,
      serviceTier: input.serviceTier,
      cuisineTypes: JSON.stringify(input.cuisinePreferences),
      dietaryRequirements: JSON.stringify(input.dietaryRequirements),
      serviceSpecificAnswers: input.serviceSpecificAnswers ? JSON.stringify(input.serviceSpecificAnswers) : undefined,
      pricingRuleVersion: pricingRule?.version ?? input.pricingRuleVersion ?? pricingState.pricingStatus,
      pricingRuleId: dbPricingRule?.id,
      pricingStatus: pricingState.pricingStatus,
      budgetStatus: pricingState.budgetStatus,
      budgetWarning: pricingState.budgetWarning,
      adultCount: guestComposition.adultCount,
      childrenUnder10: guestComposition.childrenUnder10,
      actualAttendeeCount: guestComposition.actualAttendeeCount,
      billableGuestCount: guestComposition.billableGuestCount,
      pricingGuestCount: guestComposition.pricingGuestCount,
      eventDates: input.eventDates?.length ? JSON.stringify(input.eventDates) : undefined,
      description: input.description,
      eventDate: new Date(input.eventDate),
      eventTime: input.eventTime,
      location: input.location,
      countryCode: input.country,
      currency,
      guestCount: guestComposition.actualAttendeeCount,
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

      const requestedCuisines = input.cuisinePreferences.map((value) => value.toLowerCase())
      const requestedServiceType = input.serviceType
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

        if (distance > chef.radius) {
          return false
        }

        const chefText = [
          (chef as any).cuisineType,
          (chef as any).cuisineTypes,
          (chef as any).specialties,
          (chef as any).bio,
          ...((chef as any).menus ?? []).flatMap((menu: any) => [menu.cuisineType, menu.eventType]),
          ...((chef as any).experiences ?? []).flatMap((experience: any) => [experience.serviceType, experience.cuisineType, experience.eventType]),
        ].filter(Boolean).join(" ").toLowerCase()

        const hasStructuredExperienceData = ((chef as any).experiences ?? []).length > 0
        if (requestedServiceType && hasStructuredExperienceData) {
          const serviceMatch = ((chef as any).experiences ?? []).some((experience: any) => experience.serviceType === requestedServiceType) ||
            chefText.includes(requestedServiceType.toLowerCase().replaceAll("_", " "))
          if (!serviceMatch) return false
        }

        if (requestedCuisines.length > 0 && chefText) {
          const cuisineMatch = requestedCuisines.some((cuisine) => chefText.includes(cuisine))
          if (!cuisineMatch) return false
        }

        const guestCapacityConflict = ((chef as any).experiences ?? []).some((experience: any) =>
          experience.serviceType === requestedServiceType &&
          ((experience.minGuests != null && guestComposition.pricingGuestCount < experience.minGuests) ||
            (experience.maxGuests != null && guestComposition.pricingGuestCount > experience.maxGuests))
        )

        return !guestCapacityConflict
      })
      const conflictCheckedChefs = await filterChefsWithoutAvailabilityConflicts(
        eligibleChefs,
        input.eventDates?.length ? input.eventDates : [input.eventDate]
      )

      await Promise.allSettled(
        conflictCheckedChefs.map((chef) =>
          sendPreferenceAwareEmail({
            userId: chef.userId,
            topic: "requests",
            email: chef.user.email,
            subject: `New Service Request: ${createdTitle}`,
            html: emailTemplates.newRequest(
              chef.user.name,
              createdTitle,
              created.location,
              created.budget,
              created.currency
            ),
          })
        )
      )
    }

    return created
  },

  async createMultiDayRequest(userId: string, input: {
    title?: string
    eventType: "Multi-Day Chef Hire"
    serviceType: string
    cuisinePreferences: string[]
    dietaryRequirements: string[]
    serviceSpecificAnswers?: Record<string, unknown>
    serviceTier?: string
    adultCount?: number
    childrenUnder10?: number
    eventDates: string[]
    eventTime: string
    location: string
    country: string
    guestCount: number
    budget: number
    details?: string
    dailyServiceTimes: string
    serviceNeedsPerDay: string
    accommodationTravel?: string
  }) {
    await enforceUserModeration(userId)
    await enforceClientCompliance(userId)

    validatePolicyFields({
      title: input.title,
      location: input.location,
      details: input.details,
    })

    const sortedDates = [...new Set(input.eventDates)].sort()
    const firstDate = sortedDates[0]
    const guestComposition = calculateGuestComposition({
      adultCount: input.adultCount,
      childrenUnder10: input.childrenUnder10,
      fallbackGuestCount: input.guestCount,
    })
    const currency = getCurrencyForCountry(input.country)
    const coordinates = await geocodeAddress(input.location, input.country)
    const serviceConfig = getServiceTypeOption(input.serviceType)
    if (!serviceConfig?.enabled) {
      throw new Error("INVALID_SERVICE_TYPE")
    }

    if (!serviceConfig.supportedCountries.includes(input.country as never)) {
      throw new Error("SERVICE_COUNTRY_NOT_SUPPORTED")
    }

    const serviceSpecificAnswers = {
      ...(input.serviceSpecificAnswers ?? {}),
      dailyServiceTimes: input.dailyServiceTimes,
      serviceNeedsPerDay: input.serviceNeedsPerDay,
      accommodationTravel: input.accommodationTravel ?? "",
    }

    return prisma.$transaction(async (tx) => {
      const created = await tx.request.create({
        data: {
          clientId: userId,
          title: input.title || `${getServiceTypeLabel(input.serviceType)} Multi-Day Chef Hire in ${input.location}`,
          eventType: input.eventType,
          requestMode: "MULTI_DAY",
          serviceType: input.serviceType,
          serviceTypeLabel: getServiceTypeLabel(input.serviceType),
          serviceTypeVersion: SERVICE_TYPE_REGISTRY_VERSION,
          serviceTier: input.serviceTier ?? null,
          cuisineTypes: JSON.stringify(input.cuisinePreferences),
          dietaryRequirements: JSON.stringify(input.dietaryRequirements),
          serviceSpecificAnswers: JSON.stringify(serviceSpecificAnswers),
          pricingRuleVersion: "MULTI_DAY_CUSTOM_PRICING_REQUIRED",
          pricingRuleId: null,
          pricingStatus: "CUSTOM_QUOTE_REQUIRED",
          budgetStatus: "MULTI_DAY_CUSTOM_QUOTE",
          budgetWarning: "Multi-Day Chef Hire requires a tailored quote across all selected service dates.",
          description: input.details ?? null,
          eventDate: new Date(firstDate),
          eventDates: JSON.stringify(sortedDates),
          eventTime: input.eventTime,
          location: input.location,
          countryCode: input.country,
          currency,
          guestCount: guestComposition.actualAttendeeCount,
          adultCount: guestComposition.adultCount,
          childrenUnder10: guestComposition.childrenUnder10,
          actualAttendeeCount: guestComposition.actualAttendeeCount,
          billableGuestCount: guestComposition.billableGuestCount,
          pricingGuestCount: guestComposition.pricingGuestCount,
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
          locationCity: coordinates?.city ?? null,
          locationRegion: coordinates?.region ?? null,
          formattedAddress: coordinates?.formattedAddress ?? null,
          geocodingProvider: coordinates?.provider ?? null,
          geocodingStatus: coordinates ? "VERIFIED" : "UNAVAILABLE",
          budget: input.budget,
          details: input.details ?? null,
          multiDayDates: {
            create: sortedDates.map((date) => ({
              date: new Date(date),
              startTime: null,
              endTime: null,
              serviceNeeds: input.serviceNeedsPerDay,
            })),
          },
        } as any,
      })

      return created
    })
  },

  async createFullTimeChefEnquiry(userId: string, input: {
    location: string
    country: string
    desiredStartDate: string
    expectedDuration: string
    placementType: string
    liveInPreference: string
    workingDays: string
    workingHours: string
    householdSize?: number
    adultCount?: number
    childrenUnder10?: number
    responsibilities?: string
    cuisinePreferences: string[]
    dietaryRequirements: string[]
    budgetAmount?: number
    budgetPeriod?: string
    travelRequirements?: string
    legalWorkRequirements?: string
    notes?: string
  }) {
    await enforceUserModeration(userId)
    await enforceClientCompliance(userId)

    validatePolicyFields({
      location: input.location,
      details: input.notes,
    })

    return prisma.fullTimeChefEnquiry.create({
      data: {
        clientId: userId,
        location: input.location,
        countryCode: input.country,
        currency: getCurrencyForCountry(input.country),
        desiredStartDate: new Date(input.desiredStartDate),
        expectedDuration: input.expectedDuration,
        placementType: input.placementType,
        liveInPreference: input.liveInPreference,
        workingDays: input.workingDays,
        workingHours: input.workingHours,
        householdSize: input.householdSize ?? null,
        adultCount: input.adultCount ?? null,
        childrenUnder10: input.childrenUnder10 ?? null,
        responsibilities: input.responsibilities ?? null,
        cuisineTypes: JSON.stringify(input.cuisinePreferences),
        dietaryRequirements: JSON.stringify(input.dietaryRequirements),
        budgetAmount: input.budgetAmount ?? null,
        budgetPeriod: input.budgetPeriod ?? null,
        travelRequirements: input.travelRequirements ?? null,
        legalWorkRequirements: input.legalWorkRequirements ?? null,
        notes: input.notes ?? null,
      },
    })
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

      const availabilityFilteredRequests = []
      for (const request of filteredRequests) {
        const requestDates = (request as any).multiDayDates?.length
          ? (request as any).multiDayDates.map((date: { date: Date }) => date.date)
          : [request.eventDate]

        if (!(await requestHasAvailabilityConflictForChef(chefProfile.id, requestDates))) {
          availabilityFilteredRequests.push(request)
        }
      }

      return { requests: availabilityFilteredRequests }
    }

    return { requests: await requestRepository.listAllRequests() }
  },
}
