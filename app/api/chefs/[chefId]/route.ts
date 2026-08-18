import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { derivePublicMinimumSpend, getActivePublicMinimumSpendRules } from "@/lib/public-chef-pricing"
import { PUBLIC_COMPLETED_BOOKING_STATUSES, publicChefEligibilityWhere, serializePublicChef } from "@/lib/public-chef-view"

export async function GET(
  request: Request,
  context: { params: Promise<{ chefId: string }> }
) {
  try {
    const { chefId } = await context.params
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const previewRequested = searchParams.get("preview") === "1"

    let allowPreview = false

    if (previewRequested && session?.user?.id && session.user.role === "CHEF") {
      const sessionChefProfile = await prisma.chefProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })

      allowPreview = sessionChefProfile?.id === chefId
    }

    const chefProfile = await prisma.chefProfile.findFirst({
      where: {
        id: chefId,
        ...(allowPreview ? { isBanned: false, user: { isBanned: false } } : publicChefEligibilityWhere),
      },
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
          take: 6,
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            client: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
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
    })

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef not found" }, { status: 404 })
    }

    const minimumSpendRules = await getActivePublicMinimumSpendRules()
    const minimumSpend = derivePublicMinimumSpend(chefProfile, minimumSpendRules)

    return NextResponse.json(serializePublicChef(chefProfile, {
      publicMinimumSpend: minimumSpend.amount,
      publicMinimumSpendCurrency: minimumSpend.currency,
      includeReviews: true,
    }))
  } catch (error) {
    console.error("Failed to fetch chef profile", error)
    return NextResponse.json({ error: "Failed to fetch chef profile" }, { status: 500 })
  }
}
