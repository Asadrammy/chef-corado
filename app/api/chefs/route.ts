import { NextResponse } from "next/server"

import { isPrismaConnectionError, prisma, withPrismaReconnect } from "@/lib/prisma"
import { derivePublicMinimumSpend, getActivePublicMinimumSpendRules } from "@/lib/public-chef-pricing"
import { PUBLIC_COMPLETED_BOOKING_STATUSES, publicChefEligibilityWhere, serializePublicChef } from "@/lib/public-chef-view"

export async function GET() {
  try {
    const { chefs, minimumSpendRules } = await withPrismaReconnect(async () => {
      const minimumSpendRules = await getActivePublicMinimumSpendRules()
      const chefs = await prisma.chefProfile.findMany({
        where: publicChefEligibilityWhere,
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
              experiences: true,
              reviews: true,
            },
          },
        },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
        take: 60,
      })

      return { chefs, minimumSpendRules }
    }, 1)

    return NextResponse.json(
      chefs.map((chef) => {
        const minimumSpend = derivePublicMinimumSpend(chef, minimumSpendRules)
        return serializePublicChef(chef, {
          publicMinimumSpend: minimumSpend.amount,
          publicMinimumSpendCurrency: minimumSpend.currency,
        })
      })
    )
  } catch (error) {
    console.error("Failed to fetch chefs:", error)
    if (isPrismaConnectionError(error)) {
      return NextResponse.json(
        { error: "Database connection temporarily unavailable" },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch chefs" },
      { status: 500 }
    )
  }
}
