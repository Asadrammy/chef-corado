import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { ChefRequestsMarketplace } from "@/components/chef-requests-marketplace"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { calculateDistance } from "@/lib/geo"
import { sortChefMarketplaceRequests } from "@/lib/chef-request-marketplace"
import type { ChefRequestRow } from "@/components/chef-request-table"

export const metadata: Metadata = generateMeta({
  title: "Incoming Requests",
  description: "Browse and respond to client requests in your area",
})

const localDemoRequests: ChefRequestRow[] = [
  {
    id: "local-request-anniversary",
    title: "Anniversary dinner for 10 guests",
    eventType: "Anniversary",
    serviceType: "THREE_COURSE_MEAL",
    serviceTypeLabel: "3-Course Meal",
    eventDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    location: "Downtown",
    budget: 1450,
    currency: "USD",
    details: "Anniversary dinner for 10 guests with a refined seasonal tasting menu.",
    distanceKm: 6.4,
  },
  {
    id: "local-request-tasting",
    title: "Modern Italian tasting menu",
    eventType: "Dinner Party",
    serviceType: "SIX_NINE_COURSE_MEAL",
    serviceTypeLabel: "6-9-Course Meal",
    eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    location: "West End",
    budget: 2200,
    currency: "USD",
    details: "Modern Italian tasting menu with wine-friendly courses for a private celebration.",
    distanceKm: 11.2,
  },
  {
    id: "local-request-brunch",
    title: "Private family brunch",
    eventType: "Family Event",
    serviceType: "BRUNCH",
    serviceTypeLabel: "Brunch",
    eventDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    location: "Riverside",
    budget: 980,
    currency: "USD",
    details: "Family brunch with pastries, plated mains, and relaxed tableside service.",
    distanceKm: 4.8,
  },
  {
    id: "local-request-corporate",
    title: "Executive chef's table",
    eventType: "Work Event",
    serviceType: "FOUR_FIVE_COURSE_MEAL",
    serviceTypeLabel: "4-5-Course Meal",
    eventDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    location: "Financial District",
    budget: 3100,
    currency: "USD",
    details: "Executive chef's table for a small corporate hospitality evening.",
    distanceKm: 13.7,
  },
]

export default async function ChefRequestsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  const userId = session.user?.id
  if (!userId) {
    redirect("/dashboard")
  }

  let requests: ChefRequestRow[] = []
  let serviceRadiusKm = 25
  let baseLocation: string | undefined
  let useSmartMatching = false

  try {
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        location: true,
        latitude: true,
        longitude: true,
        radius: true,
      },
    })

    if (!chefProfile) {
      redirect("/dashboard/chef/profile")
    }

    if (chefProfile.radius <= 0) {
      redirect("/dashboard/chef/profile")
    }

    const allRequests = await prisma.request.findMany({
      where: {
        OR: [
          { eventDate: { gte: new Date() } },
          { multiDayDates: { some: { date: { gte: new Date() } } } },
        ],
        proposals: {
          none: {
            chefId: chefProfile.id,
          },
        },
      },
      select: {
        id: true,
        title: true,
        eventType: true,
        serviceType: true,
        serviceTypeLabel: true,
        eventDate: true,
        location: true,
        budget: true,
        currency: true,
        details: true,
        createdAt: true,
        latitude: true,
        longitude: true,
        geocodingStatus: true,
        multiDayDates: {
          select: { date: true },
          orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
        },
      },
      orderBy: [{ createdAt: "desc" }, { eventDate: "asc" }, { id: "asc" }],
      take: 100,
    })

    requests = sortChefMarketplaceRequests(allRequests
      .map((request) => {
        const hasExactDistance =
          chefProfile.latitude != null &&
          chefProfile.longitude != null &&
          request.latitude != null &&
          request.longitude != null

        const distanceKm = hasExactDistance
          ? Math.round(
              calculateDistance(
                chefProfile.latitude as number,
                chefProfile.longitude as number,
                request.latitude as number,
                request.longitude as number
              ) * 10
            ) / 10
          : undefined

        return {
          id: request.id,
          title: request.title,
          eventType: request.eventType,
          serviceType: request.serviceType,
          serviceTypeLabel: request.serviceTypeLabel,
          eventDate: request.eventDate.toISOString(),
          createdAt: request.createdAt.toISOString(),
          submittedAt: request.createdAt.toISOString(),
          multiDayDates: request.multiDayDates.map((date) => date.date.toISOString()),
          location: request.location,
          budget: request.budget,
          currency: request.currency,
          details: request.details,
          distanceKm,
          broaderMatching: distanceKm == null,
          geocodingStatus: (request as any).geocodingStatus ?? (distanceKm == null ? "UNAVAILABLE" : "VERIFIED"),
        }
      })
      .filter((request) => request.distanceKm == null || request.distanceKm <= chefProfile.radius), "newest")

    serviceRadiusKm = chefProfile.radius
    baseLocation = chefProfile.location || undefined
    useSmartMatching = chefProfile.latitude != null && chefProfile.longitude != null
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      requests = localDemoRequests
      serviceRadiusKm = 25
      baseLocation = "Local demo kitchen"
      useSmartMatching = false
    } else {
      throw error
    }
  }

  return (
    <ChefRequestsMarketplace
      requests={requests}
      serviceRadiusKm={serviceRadiusKm}
      baseLocation={baseLocation}
      useSmartMatching={useSmartMatching}
    />
  )
}
