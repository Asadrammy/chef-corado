import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { calculateDistance } from "@/lib/geo"
import { prisma } from "@/lib/prisma"
import { derivePublicMinimumSpend, getActivePublicMinimumSpendRules } from "@/lib/public-chef-pricing"
import { PUBLIC_COMPLETED_BOOKING_STATUSES, publicChefEligibilityWhere, serializePublicChef } from "@/lib/public-chef-view"

const searchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  type: z.enum(["chefs", "requests", "all"]).default("all"),
  location: z.string().optional(),
  radius: z.number().min(1).max(500).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      query: searchParams.get("query") || "",
      type: searchParams.get("type") || "all",
      location: searchParams.get("location") || undefined,
      radius: searchParams.get("radius") ? Number(searchParams.get("radius")) : undefined,
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 20,
    }

    const validated = searchSchema.parse(params)
    const { query, type, location, radius, minPrice, maxPrice, page, limit } = validated
    const skip = (page - 1) * limit

    let centerLat: number | undefined
    let centerLon: number | undefined

    if (location) {
      const cityCoords: Record<string, { lat: number; lon: number }> = {
        "new york": { lat: 40.7128, lon: -74.006 },
        "los angeles": { lat: 34.0522, lon: -118.2437 },
        chicago: { lat: 41.8781, lon: -87.6298 },
        houston: { lat: 29.7604, lon: -95.3698 },
        london: { lat: 51.5072, lon: -0.1276 },
        manchester: { lat: 53.4808, lon: -2.2426 },
        birmingham: { lat: 52.4862, lon: -1.8904 },
      }

      const normalizedLocation = location.toLowerCase()
      if (cityCoords[normalizedLocation]) {
        centerLat = cityCoords[normalizedLocation].lat
        centerLon = cityCoords[normalizedLocation].lon
      }
    }

    const results: any = {
      chefs: [],
      requests: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    }

    if (type === "chefs" || type === "all") {
      const chefWhere: any = {
        ...publicChefEligibilityWhere,
        OR: [
          { user: { name: { contains: query, mode: "insensitive" } } },
          { bio: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
          { cuisineType: { contains: query, mode: "insensitive" } },
          { cuisineTypes: { contains: query, mode: "insensitive" } },
          { menus: { some: { title: { contains: query, mode: "insensitive" } } } },
          { menus: { some: { cuisineType: { contains: query, mode: "insensitive" } } } },
          { experiences: { some: { title: { contains: query, mode: "insensitive" } } } },
          { experiences: { some: { cuisineType: { contains: query, mode: "insensitive" } } } },
        ],
      }

      if (centerLat && centerLon && radius) {
        chefWhere.latitude = { not: null }
        chefWhere.longitude = { not: null }
      }

      const minimumSpendRules = await getActivePublicMinimumSpendRules()
      const chefs = await prisma.chefProfile.findMany({
        where: chefWhere,
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
              menuImage: true,
              cuisineType: true,
              eventType: true,
              menuType: true,
            },
            take: 3,
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
              cuisineType: true,
              eventType: true,
              minGuests: true,
              maxGuests: true,
              serviceType: true,
              offersCookingClasses: true,
              classType: true,
              pricePerStudent: true,
            },
            take: 3,
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
        skip,
        take: limit,
      })

      let filteredChefs = chefs
      const distanceByChefId = new Map<string, number>()
      if (centerLat && centerLon && radius) {
        filteredChefs = chefs.filter((chef) => {
          if (!chef.latitude || !chef.longitude) return false
          const distance = calculateDistance(centerLat!, centerLon!, chef.latitude, chef.longitude)
          if (distance > radius) return false
          distanceByChefId.set(chef.id, distance)
          return true
        })
      }

      results.chefs = filteredChefs
        .map((chef) => {
          const minimumSpend = derivePublicMinimumSpend(chef, minimumSpendRules)
          return serializePublicChef(chef, {
            publicMinimumSpend: minimumSpend.amount,
            publicMinimumSpendCurrency: minimumSpend.currency,
            distance: distanceByChefId.get(chef.id) ?? null,
          })
        })
        .filter((chef) => {
          if (minPrice != null && (chef.publicMinimumSpend == null || chef.publicMinimumSpend < minPrice)) return false
          if (maxPrice != null && (chef.publicMinimumSpend == null || chef.publicMinimumSpend > maxPrice)) return false
          return true
        })
    }

    if (type === "requests" || type === "all") {
      const requestWhere: any = {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      }

      if (minPrice || maxPrice) {
        requestWhere.budget = {
          ...(minPrice && { gte: minPrice }),
          ...(maxPrice && { lte: maxPrice }),
        }
      }

      const requests = await prisma.request.findMany({
        where: requestWhere,
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          budget: true,
          currency: true,
          eventDate: true,
          createdAt: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          proposals: {
            select: {
              id: true,
              price: true,
            },
          },
        },
        skip,
        take: limit,
      })

      results.requests = requests
    }

    const totalResults = results.chefs.length + results.requests.length
    results.pagination.total = totalResults
    results.pagination.totalPages = Math.ceil(totalResults / limit)

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error searching:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
