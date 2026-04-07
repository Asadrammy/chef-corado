import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { ChefRequestsMarketplace } from "@/components/chef-requests-marketplace"
import { prisma } from "@/lib/prisma"
import { calculateDistance } from "@/lib/geo"

export const metadata: Metadata = generateMeta({
  title: "Incoming Requests",
  description: "Browse and respond to client requests in your area",
})

export default async function ChefRequestsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  const chefProfile = await prisma.chefProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!chefProfile) {
    redirect("/dashboard/chef/profile")
  }

  if (chefProfile.latitude == null || chefProfile.longitude == null || chefProfile.radius <= 0) {
    redirect("/dashboard/chef/profile")
  }

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
    orderBy: { eventDate: "desc" },
    take: 100,
  })

  const requests = allRequests
    .map((request) => ({
      ...request,
      distanceKm: Math.round(
        calculateDistance(
          chefProfile.latitude as number,
          chefProfile.longitude as number,
          request.latitude as number,
          request.longitude as number
        ) * 10
      ) / 10,
    }))
    .filter((request) => request.distanceKm <= chefProfile.radius)

  return <ChefRequestsMarketplace requests={requests} />
}
