import { calculateDistance, geocodeAddress } from "@/lib/geo"
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
import { hasLockedRequestProposalStatus } from "@/lib/request-lifecycle"
import { withRequestPhotoFallback } from "@/lib/request-photo-schema"
import { enforceUserModeration } from "@/lib/security/moderation-guard"
import { enforceClientCompliance } from "@/lib/security/legal-compliance"
import { validatePolicyFields } from "@/lib/security/communication-policy"
import { marketConfigurationService } from "@/lib/services/market-configuration-service"
import { Role } from "@/types"
import { filterEligibleChefsForRequest } from "@/lib/chef-request-matching"
import { notifyEligibleChefsAboutRequest } from "@/lib/services/request-notification-service"
import { eventQueueService } from "@/lib/services/event-queue-service"
import { EARLY_ACCESS_WINDOW_MS, evaluateChefRequestAccessForRecords } from "@/lib/services/request-eligibility-service"
import { DIRECT_REQUEST_EXCLUSIVITY_MS } from "@/lib/services/direct-request-access"
import { getBlockingAvailabilityStatus, getChefDateAvailabilityStatuses } from "@/lib/services/default-availability"

const toDateKey = (date: Date | string) => new Date(date).toISOString().slice(0, 10)

async function requestHasAvailabilityConflictForChef(chefId: string, dates: Array<Date | string>) {
  const uniqueDateKeys = [...new Set(dates.map(toDateKey))]
  if (uniqueDateKeys.length === 0) return false

  const statuses = await getChefDateAvailabilityStatuses(prisma, chefId, uniqueDateKeys)
  return Boolean(getBlockingAvailabilityStatus(statuses))
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
    targetChefId?: string
  }) {
    await enforceUserModeration(userId)
    await enforceClientCompliance(userId)
    await marketConfigurationService.assertBookingMarketEnabled(input.country)

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

    let directChef: any = null
    if (input.targetChefId) {
      directChef = await prisma.chefProfile.findUnique({
        where: { id: input.targetChefId },
        include: {
          user: {
            select: {
              role: true,
              isBanned: true,
              name: true,
              email: true,
            },
          },
          menus: {
            select: {
              cuisineType: true,
              eventType: true,
              price: true,
            },
          },
          experiences: {
            select: {
              serviceType: true,
              cuisineType: true,
              eventType: true,
              price: true,
              minGuests: true,
              maxGuests: true,
            },
          },
        },
      })

      if (!directChef || !directChef.isApproved || directChef.isBanned || directChef.user?.isBanned || directChef.user?.role !== Role.CHEF) {
        throw new Error("TARGET_CHEF_NOT_AVAILABLE")
      }
    }

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
      geocodingStatus: coordinates?.status ?? "UNAVAILABLE",
      budget: input.budget,
      details: input.details,
    })

    if (input.targetChefId) {
      await prisma.requestInvitation.upsert({
        where: {
          requestId_chefId: {
            requestId: created.id,
            chefId: input.targetChefId,
          },
        },
        create: {
          requestId: created.id,
          chefId: input.targetChefId,
          status: "PENDING",
        },
        update: {
          status: "PENDING",
        },
      })
    }

    if (directChef || (created.latitude != null && created.longitude != null)) {
      const requestForAlerts = await withRequestPhotoFallback(
        () => prisma.request.findUnique({
          where: { id: created.id },
          include: {
            client: {
              select: {
                name: true,
                firstName: true,
                verified: true,
              },
            },
            photos: {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              take: 3,
              select: {
                id: true,
                url: true,
                originalName: true,
              },
            },
            multiDayDates: {
              orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
            },
            proposals: { select: { chefId: true, status: true } },
            invitations: { select: { chefId: true, status: true, createdAt: true } },
            _count: { select: { proposals: true } },
          },
        }),
        () => prisma.request.findUnique({
          where: { id: created.id },
          include: {
            client: {
              select: {
                name: true,
                firstName: true,
                verified: true,
              },
            },
            multiDayDates: {
              orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
            },
            proposals: { select: { chefId: true, status: true } },
            invitations: { select: { chefId: true, status: true, createdAt: true } },
            _count: { select: { proposals: true } },
          },
        })
      )

      const matchingChefs = directChef ? [directChef as any] : await requestRepository.findApprovedChefsWithCoordinates()
      let eligibleChefs = []
      if (directChef && requestForAlerts) {
        const access = await evaluateChefRequestAccessForRecords({ chef: directChef, request: requestForAlerts as any })
        eligibleChefs = access.canView ? matchingChefs : []
      } else {
        eligibleChefs = await filterEligibleChefsForRequest(
          {
            ...created,
            clientId: userId,
            requestMode: "STANDARD",
            cuisineTypes: input.cuisinePreferences,
            dietaryRequirements: input.dietaryRequirements,
            eventDates: input.eventDates,
            eventDate: input.eventDate,
            latitude: created.latitude,
            longitude: created.longitude,
            pricingGuestCount: guestComposition.pricingGuestCount,
            billableGuestCount: guestComposition.billableGuestCount,
            actualAttendeeCount: guestComposition.actualAttendeeCount,
            guestCount: guestComposition.actualAttendeeCount,
          } as any,
          matchingChefs
        )
      }

      if (requestForAlerts) {
        await notifyEligibleChefsAboutRequest({
          request: requestForAlerts,
          chefs: eligibleChefs,
        })
      }
    }

    if (input.targetChefId) {
      await eventQueueService.emit({
        eventType: "DIRECT_REQUEST_RELEASE_NOTIFY",
        payload: { requestId: created.id },
        priority: 6,
        nextRunAt: new Date(created.createdAt.getTime() + DIRECT_REQUEST_EXCLUSIVITY_MS),
        dedupeKey: `DIRECT_REQUEST_RELEASE_NOTIFY:${created.id}`,
      })
    } else {
      await eventQueueService.emit({
        eventType: "REQUEST_BROADER_ACCESS_NOTIFY",
        payload: { requestId: created.id },
        priority: 5,
        nextRunAt: new Date(created.createdAt.getTime() + EARLY_ACCESS_WINDOW_MS),
        dedupeKey: `REQUEST_BROADER_ACCESS_NOTIFY:${created.id}`,
      })
    }

    return created
  },

  async updateRequest(userId: string, requestId: string, input: {
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

    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        clientId: true,
        requestMode: true,
        _count: {
          select: {
            proposals: true,
          },
        },
      },
    })

    if (!existingRequest) {
      throw new Error("REQUEST_NOT_FOUND")
    }

    if (existingRequest.clientId !== userId) {
      throw new Error("FORBIDDEN")
    }

    if (existingRequest.requestMode !== "STANDARD") {
      throw new Error("REQUEST_EDIT_NOT_SUPPORTED")
    }

    if (existingRequest._count.proposals > 0) {
      throw new Error("REQUEST_HAS_PROPOSALS")
    }

    await marketConfigurationService.assertBookingMarketEnabled(input.country)

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

    return prisma.request.update({
      where: {
        id: requestId,
      },
      data: {
        title,
        eventType: input.eventType,
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
        geocodingStatus: coordinates?.status ?? "UNAVAILABLE",
        budget: input.budget,
        details: input.details,
      },
    })
  },

  async updateRequestNotes(userId: string, requestId: string, input: {
    details?: string
  }) {
    await enforceUserModeration(userId)
    await enforceClientCompliance(userId)

    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        clientId: true,
        requestMode: true,
        details: true,
        proposals: {
          select: {
            status: true,
          },
        },
      },
    })

    if (!existingRequest) {
      throw new Error("REQUEST_NOT_FOUND")
    }

    if (existingRequest.clientId !== userId) {
      throw new Error("FORBIDDEN")
    }

    if (existingRequest.requestMode !== "STANDARD") {
      throw new Error("REQUEST_EDIT_NOT_SUPPORTED")
    }

    if (hasLockedRequestProposalStatus(existingRequest.proposals)) {
      throw new Error("REQUEST_SUPPORT_ONLY")
    }

    return prisma.request.update({
      where: { id: requestId },
      data: {
        details: input.details != null ? input.details.trim() || null : existingRequest.details,
      },
    })
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
    budget?: number
    budgetMode: "PER_DAY" | "TOTAL_EVENT"
    totalBudget?: number
    defaultDailyBudget?: number
    dateRequirements: Array<{
      date: string
      startTime: string
      endTime?: string
      serviceType: string
      serviceTier?: string
      cuisinePreferences: string[]
      dietaryRequirements: string[]
      serviceSpecificAnswers?: Record<string, unknown>
      adultCount: number
      childrenUnder10: number
      actualAttendeeCount?: number
      billableGuestCount?: number
      pricingGuestCount?: number
      budget?: number
      notes?: string
    }>
    details?: string
    dailyServiceTimes?: string
    serviceNeedsPerDay?: string
    accommodationTravel?: string
  }) {
    await enforceUserModeration(userId)
    await enforceClientCompliance(userId)
    await marketConfigurationService.assertBookingMarketEnabled(input.country)

    validatePolicyFields({
      title: input.title,
      location: input.location,
      details: input.details,
    })

    const sortedDates = [...new Set(input.eventDates)].sort()
    const firstDate = sortedDates[0]
    const mergedDateRequirements = sortedDates.map((date) => {
      const explicit = input.dateRequirements.find((day) => day.date === date)
      if (!explicit) {
        throw new Error("MULTI_DAY_DATE_REQUIREMENTS_MISSING")
      }

      const dayComposition = calculateGuestComposition({
        adultCount: explicit.adultCount,
        childrenUnder10: explicit.childrenUnder10,
        fallbackGuestCount: explicit.adultCount,
      })
      const dayService = getServiceTypeOption(explicit.serviceType)
      if (!dayService?.enabled) {
        throw new Error("INVALID_SERVICE_TYPE")
      }
      if (!dayService.supportedCountries.includes(input.country as never)) {
        throw new Error("SERVICE_COUNTRY_NOT_SUPPORTED")
      }
      for (const question of validateServiceSpecificAnswers(explicit.serviceType, explicit.serviceSpecificAnswers)) {
        throw new Error(`SERVICE_SPECIFIC_ANSWER_REQUIRED:${question.id}`)
      }

      return {
        ...explicit,
        serviceTypeLabel: getServiceTypeLabel(explicit.serviceType),
        budget: explicit.budget ?? input.defaultDailyBudget ?? null,
        guestComposition: dayComposition,
      }
    })
    const firstDay = mergedDateRequirements[0]
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

    const estimatedTotalBudget = input.budgetMode === "TOTAL_EVENT"
      ? input.totalBudget ?? input.budget ?? 0
      : mergedDateRequirements.reduce((sum, day) => sum + Number(day.budget ?? 0), 0)
    const requestBudget = input.budget ?? estimatedTotalBudget
    const requestServiceSpecificAnswers = {
      ...(input.serviceSpecificAnswers ?? {}),
      dailyServiceTimes: input.dailyServiceTimes ?? "",
      serviceNeedsPerDay: input.serviceNeedsPerDay ?? "",
      accommodationTravel: input.accommodationTravel ?? "",
      budgetMode: input.budgetMode,
      defaultDailyRequirements: {
        serviceType: input.serviceType,
        serviceTier: input.serviceTier ?? "",
        eventTime: input.eventTime,
        cuisinePreferences: input.cuisinePreferences,
        dietaryRequirements: input.dietaryRequirements,
        adultCount: guestComposition.adultCount,
        childrenUnder10: guestComposition.childrenUnder10,
        budget: input.defaultDailyBudget ?? input.totalBudget ?? input.budget ?? null,
      },
    }

    const created = await prisma.$transaction(async (tx) => {
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
          pricingRuleVersion: "MULTI_DAY_CUSTOM_PRICING_REQUIRED",
          pricingRuleId: null,
          pricingStatus: "CUSTOM_QUOTE_REQUIRED",
          budgetStatus: "MULTI_DAY_CUSTOM_QUOTE",
          budgetWarning: input.budgetMode === "PER_DAY"
            ? "Multi-Day Chef Hire uses daily client budget guidance and requires a tailored chef quote."
            : "Multi-Day Chef Hire uses a total client budget for all selected service dates and requires a tailored chef quote.",
          description: input.details ?? null,
          eventDate: new Date(firstDate),
          eventDates: JSON.stringify(sortedDates),
          eventTime: firstDay.startTime || input.eventTime,
          location: input.location,
          countryCode: input.country,
          currency,
          guestCount: firstDay.guestComposition.actualAttendeeCount,
          adultCount: firstDay.guestComposition.adultCount,
          childrenUnder10: firstDay.guestComposition.childrenUnder10,
          actualAttendeeCount: firstDay.guestComposition.actualAttendeeCount,
          billableGuestCount: firstDay.guestComposition.billableGuestCount,
          pricingGuestCount: firstDay.guestComposition.pricingGuestCount,
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
          locationCity: coordinates?.city ?? null,
          locationRegion: coordinates?.region ?? null,
          formattedAddress: coordinates?.formattedAddress ?? null,
          geocodingProvider: coordinates?.provider ?? null,
          geocodingStatus: coordinates?.status ?? "UNAVAILABLE",
          budget: requestBudget,
          budgetMode: input.budgetMode,
          totalBudget: input.budgetMode === "TOTAL_EVENT" ? requestBudget : estimatedTotalBudget,
          defaultDailyBudget: input.budgetMode === "PER_DAY" ? input.defaultDailyBudget ?? null : null,
          details: input.details ?? null,
          serviceSpecificAnswers: JSON.stringify(requestServiceSpecificAnswers),
          multiDayDates: {
            create: mergedDateRequirements.map((day, index) => ({
              date: new Date(day.date),
              startTime: day.startTime,
              endTime: day.endTime || null,
              serviceType: day.serviceType,
              serviceTypeLabel: day.serviceTypeLabel,
              serviceTier: day.serviceTier || null,
              cuisineTypes: JSON.stringify(day.cuisinePreferences),
              dietaryRequirements: JSON.stringify(day.dietaryRequirements),
              serviceSpecificAnswers: JSON.stringify(day.serviceSpecificAnswers ?? {}),
              adultCount: day.guestComposition.adultCount,
              childrenUnder10: day.guestComposition.childrenUnder10,
              actualAttendeeCount: day.guestComposition.actualAttendeeCount,
              billableGuestCount: day.guestComposition.billableGuestCount,
              pricingGuestCount: day.guestComposition.pricingGuestCount,
              budget: day.budget,
              notes: day.notes || null,
              serviceNeeds: day.notes || input.serviceNeedsPerDay || null,
              sortOrder: index,
            })),
          },
        } as any,
        include: {
          multiDayDates: { orderBy: { sortOrder: "asc" } },
        },
      })

      return created
    })

    if (created.latitude != null && created.longitude != null) {
      const requestForAlerts = await withRequestPhotoFallback(
        () => prisma.request.findUnique({
          where: { id: created.id },
          include: {
            client: {
              select: {
                name: true,
                firstName: true,
                verified: true,
              },
            },
            photos: {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              take: 3,
              select: {
                id: true,
                url: true,
                originalName: true,
              },
            },
            multiDayDates: {
              orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
            },
          },
        }),
        () => prisma.request.findUnique({
          where: { id: created.id },
          include: {
            client: {
              select: {
                name: true,
                firstName: true,
                verified: true,
              },
            },
            multiDayDates: {
              orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
            },
          },
        })
      )

      const matchingChefs = await requestRepository.findApprovedChefsWithCoordinates()
      const eligibleChefs = await filterEligibleChefsForRequest(
        {
          ...created,
          clientId: userId,
          requestMode: "MULTI_DAY",
          serviceType: input.serviceType,
          cuisineTypes: input.cuisinePreferences,
          eventDates: sortedDates,
          multiDayDates: mergedDateRequirements.map((day) => ({
            date: day.date,
            serviceType: day.serviceType,
            cuisineTypes: day.cuisinePreferences,
            dietaryRequirements: day.dietaryRequirements,
          })),
          latitude: created.latitude,
          longitude: created.longitude,
          pricingGuestCount: guestComposition.pricingGuestCount,
          billableGuestCount: guestComposition.billableGuestCount,
          actualAttendeeCount: guestComposition.actualAttendeeCount,
          guestCount: guestComposition.actualAttendeeCount,
        } as any,
        matchingChefs
      )

      if (requestForAlerts) {
        await notifyEligibleChefsAboutRequest({
          request: requestForAlerts,
          chefs: eligibleChefs,
        })
      }
    }

    return created
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
    await marketConfigurationService.assertBookingMarketEnabled(input.country)

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

      const chefProfile = await prisma.chefProfile.findUnique({
        where: { userId },
        include: {
          user: { select: { name: true, email: true, role: true, isBanned: true } },
          menus: { select: { cuisineType: true, eventType: true } },
          experiences: { select: { serviceType: true, cuisineType: true, eventType: true, minGuests: true, maxGuests: true } },
        },
      })

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
      const filteredRequests = (await Promise.all(allRequests
        .map(async (request) => {
          const access = await evaluateChefRequestAccessForRecords({ chef: chefProfile, request })
          if (!access.canView || request.proposals.some((proposal) => proposal.chefId === chefProfile.id)) {
            return null
          }

          if (
            chefProfile.latitude == null ||
            chefProfile.longitude == null ||
            request.latitude == null ||
            request.longitude == null
          ) {
            return {
              ...request,
              distanceKm: null,
              broaderMatching: access.broaderAccess,
              earlyAccess: access.earlyAccess && access.local,
              directRequest: access.directRequest && access.invited,
              beFirstToRespond: access.beFirstToRespond,
              canSubmitProposal: access.canPropose,
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
            distanceKm: access.distanceKm != null ? Math.round(access.distanceKm * 10) / 10 : Math.round(distance * 10) / 10,
            broaderMatching: access.broaderAccess,
            earlyAccess: access.earlyAccess && access.local,
            directRequest: access.directRequest && access.invited,
            beFirstToRespond: access.beFirstToRespond,
            canSubmitProposal: access.canPropose,
          }
        }))).filter((request): request is NonNullable<typeof request> => request != null)

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
