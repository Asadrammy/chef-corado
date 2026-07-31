import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { ChefRequestsMarketplace } from "@/components/chef-requests-marketplace"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"
import { calculateDistance } from "@/lib/geo"
import type { ChefRequestRow } from "@/components/chef-request-table"

export const metadata: Metadata = generateMeta({
  title: "Incoming Requests",
  description: "Browse and respond to client requests in your area",
})

const localDemoRequests: ChefRequestRow[] = [
  {
    id: "local-request-anniversary",
    eventDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Downtown",
    budget: 1450,
    currency: "USD",
    details: "Anniversary dinner for 10 guests with a refined seasonal tasting menu.",
    distanceKm: 6.4,
  },
  {
    id: "local-request-tasting",
    eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    location: "West End",
    budget: 2200,
    currency: "USD",
    details: "Modern Italian tasting menu with wine-friendly courses for a private celebration.",
    distanceKm: 11.2,
  },
  {
    id: "local-request-brunch",
    eventDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Riverside",
    budget: 980,
    currency: "USD",
    details: "Family brunch with pastries, plated mains, and relaxed tableside service.",
    distanceKm: 4.8,
  },
  {
    id: "local-request-corporate",
    eventDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
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
        eventDate: { gte: new Date() },
        proposals: {
          none: {
            chefId: chefProfile.id,
          },
        },
      },
      orderBy: { eventDate: "desc" },
      take: 100,
    })

    requests = allRequests
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
          eventDate: request.eventDate.toISOString(),
          location: request.location,
          budget: request.budget,
          currency: request.currency,
          details: request.details,
          distanceKm,
          broaderMatching: distanceKm == null,
          geocodingStatus: (request as any).geocodingStatus ?? (distanceKm == null ? "UNAVAILABLE" : "VERIFIED"),
        }
      })
      .filter((request) => request.distanceKm == null || request.distanceKm <= chefProfile.radius)

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
