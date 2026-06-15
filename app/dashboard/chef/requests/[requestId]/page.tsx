import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { ChefRequestDetail } from "@/components/chef-request-detail"
import { authOptions } from "@/lib/auth"
import { isPrismaConnectionError, prisma } from "@/lib/prisma"

interface ChefRequestDetailPageProps {
  params: Promise<{ requestId: string }>
}

function getLocalDemoRequest(requestId: string) {
  const demos = {
    "local-request-anniversary": {
      title: "Anniversary dinner for 10 guests",
      eventType: "Anniversary",
      description: "A polished private dinner with seasonal courses, graceful pacing, and a celebratory finish.",
      location: "Downtown",
      budget: 1450,
      guestCount: 10,
      details: "Client wants a refined tasting menu with seafood, a vegetarian course, and a memorable dessert.",
      client: { name: "Maya R.", email: "local-demo@example.com" },
    },
    "local-request-tasting": {
      title: "Modern Italian tasting menu",
      eventType: "Private Dining",
      description: "A wine-friendly Italian tasting menu for an intimate celebration.",
      location: "West End",
      budget: 2200,
      guestCount: 14,
      details: "Client prefers handmade pasta, lighter sauces, and a tableside finishing moment.",
      client: { name: "Daniel K.", email: "local-demo@example.com" },
    },
    "local-request-brunch": {
      title: "Private family brunch",
      eventType: "Brunch",
      description: "Relaxed family brunch with plated mains, pastries, and warm hospitality.",
      location: "Riverside",
      budget: 980,
      guestCount: 8,
      details: "Client asked for a comforting menu with fresh pastries, eggs, fruit, and coffee service.",
      client: { name: "Avery P.", email: "local-demo@example.com" },
    },
    "local-request-corporate": {
      title: "Executive chef's table",
      eventType: "Corporate",
      description: "A discreet chef's table for a small executive hospitality evening.",
      location: "Financial District",
      budget: 3100,
      guestCount: 12,
      details: "Client wants premium ingredients, tight timing, and a calm restaurant-level service flow.",
      client: { name: "Sutton Group", email: "local-demo@example.com" },
    },
  } as const

  const demo = demos[requestId as keyof typeof demos] ?? demos["local-request-anniversary"]
  const eventDate = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString()

  return {
    id: requestId,
    ...demo,
    status: "OPEN",
    eventDate,
    currency: "USD",
    totalProposalCount: 3,
    proposals: [],
  }
}

export default async function ChefRequestDetailPage({ params }: ChefRequestDetailPageProps) {
  const { requestId } = await params
  const session = await getServerSession(authOptions)

  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  const userId = session.user?.id
  if (!userId) {
    redirect("/dashboard")
  }

  try {
    const chefProfile = await prisma.chefProfile.findUnique({
      where: { userId },
    })

    if (!chefProfile) {
      redirect("/dashboard/chef/profile")
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            proposals: true,
          },
        },
        proposals: {
          where: {
            chefId: chefProfile.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            price: true,
            message: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })

    if (!request) {
      notFound()
    }

    const requestForView = {
      id: request.id,
      title: request.title,
      eventType: request.eventType,
      description: request.description ?? request.details ?? "",
      status: request.proposals[0]?.status ?? "OPEN",
      eventDate: request.eventDate.toISOString(),
      location: request.location,
      budget: request.budget,
      currency: request.currency,
      guestCount: request.guestCount,
      totalProposalCount: request._count.proposals,
      details: request.details,
      client: {
        name: request.client.name,
        email: request.client.email,
      },
      proposals: request.proposals.map((proposal) => ({
        id: proposal.id,
        price: proposal.price,
        message: proposal.message,
        status: proposal.status,
        createdAt: proposal.createdAt.toISOString(),
      })),
    }

    return <ChefRequestDetail request={requestForView} session={session} />
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      return <ChefRequestDetail request={getLocalDemoRequest(requestId)} session={session} />
    }

    throw error
  }
}
