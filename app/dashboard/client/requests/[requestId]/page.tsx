import { cookies } from "next/headers"
import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  ChefHat,
  Utensils,
  Clock,
} from "lucide-react"

import { authOptions } from "@/lib/auth"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = generateMeta({
  title: "Request Details",
  description: "View detailed information about your request.",
})

export default async function RequestDetailsPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  cookies()

  const { requestId } = await params
  const userId = session.user.id as string

  const request = await prisma.request.findUnique({
    where: { 
      id: requestId,
      clientId: userId,
    },
    include: {
      _count: {
        select: {
          proposals: true,
        },
      },
      proposals: {
        include: {
          chef: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!request) {
    notFound()
  }

  const cuisineTypes = request.cuisineTypes ? JSON.parse(request.cuisineTypes as string) : []
  const dietaryRequirements = request.dietaryRequirements ? JSON.parse(request.dietaryRequirements as string) : []
  const attendeeLabel = request.eventType === "Cooking Class" ? "students" : "guests"

  return (
    <div className="space-y-6 lg:space-y-7">
      <div className="brand-surface rounded-[30px] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/client/requests">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Request Details</h1>
              <p className="text-sm text-muted-foreground">View and manage your request information.</p>
            </div>
          </div>
          <Link href={`/dashboard/client/proposals?requestId=${request.id}`}>
            <Button className="brand-gradient-button h-11 rounded-2xl px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
              View Proposals ({request._count.proposals})
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Information */}
        <Card className="brand-card-surface rounded-[30px] shadow-lg shadow-slate-900/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">{request.title || "Untitled Request"}</CardTitle>
            <CardDescription>Request ID: {request.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Event Date</p>
                  <p className="font-semibold">{format(new Date(request.eventDate), "PPP")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="font-semibold">{request.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{request.eventType === "Cooking Class" ? "Student Count" : "Guest Count"}</p>
                  <p className="font-semibold">{request.guestCount} {attendeeLabel}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Budget</p>
                <p className="mt-1 font-semibold text-foreground">{formatCurrency(request.budget, request.currency)}</p>
              </div>
            </div>

            {request.details && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Additional Details</p>
                <p className="text-sm leading-relaxed">{request.details}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Preferences */}
        <Card className="brand-card-surface rounded-[30px] shadow-lg shadow-slate-900/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Event Preferences</CardTitle>
            <CardDescription>Your culinary and dietary requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Utensils className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Cuisine Types</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {cuisineTypes.length > 0 ? (
                  cuisineTypes.map((cuisine: string) => (
                    <Badge key={cuisine} variant="secondary" className="rounded-xl">
                      {cuisine}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No cuisine preferences specified</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <ChefHat className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Dietary Requirements</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {dietaryRequirements.length > 0 ? (
                  dietaryRequirements.map((dietary: string) => (
                    <Badge key={dietary} variant="outline" className="rounded-xl">
                      {dietary}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No dietary requirements specified</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Event Type</p>
                <p className="font-semibold">{request.eventType}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals Summary */}
      {request.proposals.length > 0 && (
        <Card className="brand-card-surface rounded-[30px] shadow-lg shadow-slate-900/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Recent Proposals</CardTitle>
            <CardDescription>Chefs who have responded to your request</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {request.proposals.slice(0, 3).map((proposal) => (
                <div key={proposal.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ChefHat className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{proposal.chef.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(proposal.price, proposal.currency)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      proposal.status === "PENDING"
                        ? "secondary"
                        : proposal.status === "ACCEPTED_PENDING_PAYMENT"
                        ? "default"
                        : "outline"
                    }
                    className="rounded-xl"
                  >
                    {proposal.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
              {request.proposals.length > 3 && (
                <Link href={`/dashboard/client/proposals?requestId=${request.id}`}>
                  <Button variant="outline" className="w-full rounded-xl">
                    View All {request.proposals.length} Proposals
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
