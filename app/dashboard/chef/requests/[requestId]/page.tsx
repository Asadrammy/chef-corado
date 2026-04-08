import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { ChefRequestDetail } from "@/components/chef-request-detail"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface ChefRequestDetailPageProps {
  params: Promise<{ requestId: string }>
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
    description: request.description ?? request.details ?? "",
    status: request.proposals[0]?.status ?? "OPEN",
    eventDate: request.eventDate.toISOString(),
    location: request.location,
    budget: request.budget,
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
}
