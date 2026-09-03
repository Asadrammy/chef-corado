import { NextRequest, NextResponse } from "next/server"

import { filterChefsByRadius, geocodeAddress } from "@/lib/geo"
import { isPrismaConnectionError, prisma, withPrismaReconnect } from "@/lib/prisma"
import { applyPublicMinimumSpendFilter, derivePublicMinimumSpend, getActivePublicMinimumSpendRules } from "@/lib/public-chef-pricing"
import { PUBLIC_COMPLETED_BOOKING_STATUSES, publicChefEligibilityWhere, serializePublicChef } from "@/lib/public-chef-view"
import { getChefDateAvailabilityStatuses } from "@/lib/services/default-availability"

function parseNumber(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function splitParam(value: string | null) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined, direction: "asc" | "desc") {
  const aValid = typeof a === "number"
  const bValid = typeof b === "number"
  if (!aValid && !bValid) return 0
  if (!aValid) return 1
  if (!bValid) return -1
  return direction === "asc" ? a - b : b - a
}

function sortPublicChefs(chefs: ReturnType<typeof serializePublicChef>[], sort: string) {
  const sorted = [...chefs]

  sorted.sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return compareNullableNumber(a.publicMinimumSpend, b.publicMinimumSpend, "asc") || a.displayName.localeCompare(b.displayName)
      case "price_desc":
        return compareNullableNumber(a.publicMinimumSpend, b.publicMinimumSpend, "desc") || a.displayName.localeCompare(b.displayName)
      case "newest":
        return new Date(b.approvedAt || b.createdAt || 0).getTime() - new Date(a.approvedAt || a.createdAt || 0).getTime()
      case "jobs":
        return b.completedJobs - a.completedJobs || a.displayName.localeCompare(b.displayName)
      case "closest":
        return compareNullableNumber(a.distance, b.distance, "asc") || a.displayName.localeCompare(b.displayName)
      case "popular":
      default:
        // Interim popularity model: completed ChefaChef jobs first, then public review volume/rating.
        // Kept centralized so a future client-approved ranking formula can replace it cleanly.
        return (
          b.completedJobs - a.completedJobs ||
          b.reviewCount - a.reviewCount ||
          b.averageRating - a.averageRating ||
          a.displayName.localeCompare(b.displayName)
        )
    }
  })

  return sorted
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("query") || "").trim()
    const cuisines = splitParam(searchParams.get("cuisines") || searchParams.get("cuisine"))
    const serviceType = (searchParams.get("serviceType") || "").trim()
    const eventType = (searchParams.get("eventType") || "").trim()
    const dietary = splitParam(searchParams.get("dietary"))
    const location = (searchParams.get("location") || "").trim()
    const minBudget = parseNumber(searchParams.get("minBudget") || searchParams.get("minPrice"))
    const maxBudget = parseNumber(searchParams.get("maxBudget") || searchParams.get("maxPrice"))
    const eventDate = searchParams.get("eventDate")
    const minRating = parseNumber(searchParams.get("minRating"))
    const sort = searchParams.get("sort") || searchParams.get("sortBy") || "popular"
    const page = Math.max(1, Number(searchParams.get("page") || 1))
    const limit = Math.min(36, Math.max(1, Number(searchParams.get("limit") || 24)))
    let userLat = searchParams.get("latitude")
    let userLon = searchParams.get("longitude")
    const searchRadius = parseNumber(searchParams.get("radius")) ?? 50

    const where: any = {
      ...publicChefEligibilityWhere,
      AND: [],
    }

    if (query) {
      where.AND.push({
        OR: [
          { user: { name: { contains: query, mode: "insensitive" } } },
          { bio: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
          { specialties: { contains: query, mode: "insensitive" } },
          { cuisineType: { contains: query, mode: "insensitive" } },
          { cuisineTypes: { contains: query, mode: "insensitive" } },
          { menus: { some: { title: { contains: query, mode: "insensitive" } } } },
          { menus: { some: { cuisineType: { contains: query, mode: "insensitive" } } } },
          { experiences: { some: { title: { contains: query, mode: "insensitive" } } } },
          { experiences: { some: { cuisineType: { contains: query, mode: "insensitive" } } } },
        ],
      })
    }

    if (cuisines.length) {
      where.AND.push({
        OR: cuisines.flatMap((cuisine) => [
          { cuisineType: { contains: cuisine, mode: "insensitive" } },
          { cuisineTypes: { contains: cuisine, mode: "insensitive" } },
          { menus: { some: { cuisineType: { contains: cuisine, mode: "insensitive" } } } },
          { experiences: { some: { cuisineType: { contains: cuisine, mode: "insensitive" } } } },
        ]),
      })
    }

    if (serviceType) {
      where.AND.push({
        OR: [
          { experiences: { some: { serviceType } } },
          { specialties: { contains: serviceType.replaceAll("_", " "), mode: "insensitive" } },
          { bio: { contains: serviceType.replaceAll("_", " "), mode: "insensitive" } },
        ],
      })
    }

    if (eventType) {
      where.AND.push({
        OR: [
          { menus: { some: { eventType: { contains: eventType, mode: "insensitive" } } } },
          { experiences: { some: { eventType: { contains: eventType, mode: "insensitive" } } } },
        ],
      })
    }

    if (dietary.length) {
      where.AND.push({
        OR: dietary.flatMap((item) => [
          { bio: { contains: item, mode: "insensitive" } },
          { menus: { some: { description: { contains: item, mode: "insensitive" } } } },
          { experiences: { some: { description: { contains: item, mode: "insensitive" } } } },
        ]),
      })
    }

    if (location) {
      if (!userLat || !userLon) {
        const geocodedLocation = await geocodeAddress(location)
        if (geocodedLocation) {
          userLat = String(geocodedLocation.latitude)
          userLon = String(geocodedLocation.longitude)
        }
      }

      if (!userLat || !userLon) {
        where.AND.push({ location: { contains: location, mode: "insensitive" } })
      }
    }

    if (!where.AND.length) delete where.AND

    const { chefs, minimumSpendRules } = await withPrismaReconnect(async () => {
      const minimumSpendRules = await getActivePublicMinimumSpendRules()
      const chefs = await prisma.chefProfile.findMany({
        where,
        select: {
          id: true,
          bio: true,
          experience: true,
          location: true,
          radius: true,
          profileImage: true,
          chefType: true,
          specialties: true,
          cuisineType: true,
          cuisineTypes: true,
          baseCountryCode: true,
          preferredCurrency: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          approvedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
            },
          },
          menus: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              currency: true,
              menuType: true,
              menuImage: true,
              cuisineType: true,
              eventType: true,
            },
            orderBy: { createdAt: "desc" },
            take: 4,
          },
          experiences: {
            where: { isActive: true },
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              currency: true,
              duration: true,
              eventType: true,
              cuisineType: true,
              minGuests: true,
              maxGuests: true,
              serviceType: true,
              offersCookingClasses: true,
              classType: true,
              pricePerStudent: true,
            },
            orderBy: { createdAt: "desc" },
            take: 4,
          },
          reviews: {
            select: { rating: true },
          },
          bookings: {
            where: { status: { in: [...PUBLIC_COMPLETED_BOOKING_STATUSES] } },
            select: { id: true, status: true },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
        take: 120,
      })

      return { chefs, minimumSpendRules }
    }, 1)

    let publicChefs = chefs.map((chef) => {
      const minimumSpend = derivePublicMinimumSpend(chef, minimumSpendRules)
      return serializePublicChef(
        { ...chef, publicMinimumSpend: minimumSpend.amount, publicMinimumSpendCurrency: minimumSpend.currency },
        {
          publicMinimumSpend: minimumSpend.amount,
          publicMinimumSpendCurrency: minimumSpend.currency,
        }
      )
    })

    if (userLat && userLon) {
      const userLatitude = Number(userLat)
      const userLongitude = Number(userLon)
      if (Number.isFinite(userLatitude) && Number.isFinite(userLongitude)) {
        const chefsWithinRadius = filterChefsByRadius(
          chefs.map((chef) => ({
            id: chef.id,
            latitude: chef.latitude,
            longitude: chef.longitude,
            radius: chef.radius,
          })),
          userLatitude,
          userLongitude,
          searchRadius
        )
        const distanceByChefId = new Map(chefsWithinRadius.map((chef) => [chef.id, chef.distance]))
        publicChefs = publicChefs
          .filter((chef) => distanceByChefId.has(chef.id))
          .map((chef) => ({ ...chef, distance: distanceByChefId.get(chef.id) ?? null }))
      }
    }

    if (eventDate && publicChefs.length > 0) {
      const requestedDate = new Date(eventDate)
      if (!Number.isNaN(requestedDate.getTime())) {
        const statuses = await Promise.all(publicChefs.map(async (chef) => {
          const [status] = await getChefDateAvailabilityStatuses(prisma, chef.id, [requestedDate])
          return [chef.id, status] as const
        }))
        const availabilityByChef = new Map(statuses)

        publicChefs = publicChefs.filter((chef) => availabilityByChef.get(chef.id)?.available ?? true)
      }
    }

    if (minRating != null) {
      publicChefs = publicChefs.filter((chef) => chef.averageRating >= minRating)
    }

    publicChefs = applyPublicMinimumSpendFilter(publicChefs, minBudget, maxBudget)
    publicChefs = sortPublicChefs(publicChefs, sort)

    const start = (page - 1) * limit
    return NextResponse.json(publicChefs.slice(start, start + limit))
  } catch (error) {
    console.error("Error searching chefs:", error)
    if (isPrismaConnectionError(error)) {
      return NextResponse.json(
        { error: "Database connection temporarily unavailable" },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: "Failed to search chefs" }, { status: 500 })
  }
}
