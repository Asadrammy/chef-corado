import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function formatChefProfile(profile: any) {
  const totalRatings = (profile.reviews ?? []).reduce((sum: number, review: { rating: number }) => sum + review.rating, 0)
  const averageRating = profile.reviews?.length ? totalRatings / profile.reviews.length : 0

  return {
    id: profile.id,
    bio: profile.bio,
    experience: profile.experience,
    location: profile.location,
    radius: profile.radius,
    profileImage: profile.profileImage,
    chefType: profile.chefType,
    certifications: profile.certifications
      ? profile.certifications.split(",").map((value: string) => value.trim()).filter(Boolean)
      : [],
    eventsPerMonth: profile.eventsPerMonth,
    isApproved: profile.isApproved,
    averageRating: Number(averageRating.toFixed(1)),
    reviewCount: profile.reviews?.length ?? 0,
    user: {
      id: profile.user.id,
      name: profile.user.name,
      verified: profile.user.verified,
      experienceLevel: profile.user.experienceLevel,
    },
    experiences: (profile.experiences ?? []).map((experience: any) => ({
      id: experience.id,
      title: experience.title,
      description: experience.description,
      price: experience.price,
      currency: experience.currency,
      duration: experience.duration,
      eventType: experience.eventType,
      cuisineType: experience.cuisineType,
      minGuests: experience.minGuests,
      maxGuests: experience.maxGuests,
      serviceType: experience.serviceType,
      offersCookingClasses: experience.offersCookingClasses,
      classType: experience.classType,
      pricePerStudent: experience.pricePerStudent,
    })),
    menus: (profile.menus ?? []).map((menu: any) => ({
      id: menu.id,
      title: menu.title,
      description: menu.description,
      price: menu.price,
      currency: menu.currency,
      menuType: menu.menuType,
      menuImage: menu.menuImage,
      cuisineType: menu.cuisineType,
      eventType: menu.eventType,
    })),
    reviews: (profile.reviews ?? []).map((review: any) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      client: {
        name: review.client?.name ?? "Anonymous",
      },
    })),
  }
}

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

    const chefProfile = await (prisma as any).chefProfile.findFirst({
      where: {
        id: chefId,
        ...(allowPreview ? {} : { isApproved: true }),
        isBanned: false,
        user: {
          isBanned: false,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            verified: true,
            experienceLevel: true,
          },
        },
        menus: {
          orderBy: { createdAt: "desc" },
        },
        experiences: {
          where: {
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        },
        reviews: {
          include: {
            client: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
        },
      },
    })

    if (!chefProfile) {
      return NextResponse.json({ error: "Chef not found" }, { status: 404 })
    }

    return NextResponse.json(formatChefProfile(chefProfile))
  } catch (error) {
    console.error("Failed to fetch chef profile", error)
    return NextResponse.json({ error: "Failed to fetch chef profile" }, { status: 500 })
  }
}
