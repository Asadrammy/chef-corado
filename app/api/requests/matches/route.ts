import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { SmartMatchingService } from "@/lib/services/smart-matching-service"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"

/**
 * GET /api/requests/matches
 * Returns requests with smart match scores for the authenticated chef
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "CHEF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get chef profile
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
      include: { user: { select: { isBanned: true } } },
    })

    if (!chefProfile) {
      return NextResponse.json(
        { error: "Chef profile not found" },
        { status: 404 }
      )
    }

    if (
      !chefProfile.isApproved ||
      chefProfile.isBanned ||
      chefProfile.user.isBanned
    ) {
      return NextResponse.json(
        { error: "Chef profile is not eligible for matching" },
        { status: 403 }
      )
    }

    if (
      chefProfile.latitude == null ||
      chefProfile.longitude == null ||
      chefProfile.radius <= 0
    ) {
      return NextResponse.json(
        { error: "Chef location not set" },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const minScore = parseInt(searchParams.get("minScore") || "0", 10)

    // Fetch available requests within radius
    const allRequests = await prisma.request.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        eventDate: { gte: new Date() },
        proposals: {
          none: {
            chefId: chefProfile.id,
          },
        },
      },
      include: {
        multiDayDates: true,
      },
      orderBy: { eventDate: "asc" },
      take: limit * 2, // Fetch more to filter by score
    })

    // Filter by distance first (quick filter)
    const nearbyRequests = allRequests.filter((req) => {
      if (!req.latitude || !req.longitude) return false

      const distance = calculateQuickDistance(
        chefProfile.latitude as number,
        chefProfile.longitude as number,
        req.latitude,
        req.longitude
      )

      return distance <= chefProfile.radius
    })

    const requestedDates = Array.from(new Set(nearbyRequests.flatMap((request) =>
      request.multiDayDates.length > 0
        ? request.multiDayDates.map((date) => date.date.toISOString().slice(0, 10))
        : [request.eventDate.toISOString().slice(0, 10)]
    )))

    const knownAvailability = requestedDates.length > 0
      ? await prisma.availability.findMany({
          where: {
            chefId: chefProfile.id,
            date: { in: requestedDates.map((date) => new Date(date)) },
          },
        })
      : []

    const availabilityByDate = new Map(
      knownAvailability.map((slot) => [slot.date.toISOString().slice(0, 10), slot])
    )

    const availableRequests = nearbyRequests.filter((request) => {
      const dates = request.multiDayDates.length > 0
        ? request.multiDayDates.map((date) => date.date.toISOString().slice(0, 10))
        : [request.eventDate.toISOString().slice(0, 10)]

      return dates.every((date) => {
        const slot = availabilityByDate.get(date)
        return !slot || (slot.isAvailable && slot.currentBookings < slot.maxBookings)
      })
    })

    // Calculate smart match scores
    const parseList = (value?: string | null) => {
      if (!value) return []
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
      } catch {
        return []
      }
    }

    const requestData = availableRequests.map((r) => ({
      id: r.id,
      budget: r.budget,
      eventDate: r.eventDate,
      requestDates: r.multiDayDates.length > 0 ? r.multiDayDates.map((date) => date.date) : [r.eventDate],
      serviceType: r.serviceType,
      eventType: r.eventType,
      cuisineTypes: parseList(r.cuisineTypes),
      dietaryRequirements: parseList(r.dietaryRequirements),
      pricingGuestCount: r.pricingGuestCount,
      details: r.details,
      latitude: r.latitude,
      longitude: r.longitude,
    }))

    const matches = await SmartMatchingService.batchCalculateMatches(
      requestData,
      chefProfile.id
    )

    // Filter by minimum score and sort
    const filteredMatches = matches
      .filter((m) => m.matchScore >= minScore)
      .slice(0, limit)

    // Enrich with full request data
    const enrichedMatches = await Promise.all(
      filteredMatches.map(async (match) => {
        const request = nearbyRequests.find((r) => r.id === match.requestId)
        if (!request) return null
        const requestDates = request.multiDayDates.length > 0
          ? request.multiDayDates.map((date) => date.date.toISOString().slice(0, 10))
          : [request.eventDate.toISOString().slice(0, 10)]

        return {
          ...match,
          availability: {
            checkedDates: requestDates,
            fallbackUsed: requestDates.some((date) => !availabilityByDate.has(date)),
          },
          request: {
            id: request.id,
            title: request.title,
            description: request.description,
            eventDate: request.eventDate.toISOString(),
            location: request.location,
            budget: request.budget,
            currency: request.currency,
            serviceType: request.serviceType,
            serviceTypeLabel: request.serviceTypeLabel,
            eventType: request.eventType,
            cuisineTypes: parseList(request.cuisineTypes),
            dietaryRequirements: parseList(request.dietaryRequirements),
            pricingStatus: request.pricingStatus,
            budgetStatus: request.budgetStatus,
            budgetWarning: request.budgetWarning,
            details: request.details,
            latitude: request.latitude,
            longitude: request.longitude,
            createdAt: request.createdAt.toISOString(),
          },
        }
      })
    )

    const validMatches = enrichedMatches.filter(Boolean)

    return NextResponse.json({
      matches: validMatches,
      total: availableRequests.length,
      filtered: validMatches.length,
    })
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return NextResponse.json({
        matches: [],
        total: 0,
        filtered: 0,
        localDemo: true,
      })
    }

    console.error("Error calculating request matches:", error)
    return NextResponse.json(
      { error: "Failed to calculate matches" },
      { status: 500 }
    )
  }
}

/**
 * Quick distance calculation for filtering (uses Haversine)
 */
function calculateQuickDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
