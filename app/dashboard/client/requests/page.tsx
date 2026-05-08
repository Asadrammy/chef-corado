import { cookies } from "next/headers"
import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import {
  ClipboardList,
  Calendar,
  MapPin,
  Users,
  ChefHat,
} from "lucide-react"

import { authOptions } from "@/lib/auth"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type RequestRow = {
  id: string
  title: string | null
  eventType: string
  cuisineTypes: string | null
  dietaryRequirements: string | null
  eventDate: Date
  location: string
  budget: number
  currency: string
  guestCount: number
  status?: string
  _count: {
    proposals: number
  }
}

export const metadata: Metadata = generateMeta({
  title: "My Requests",
  description: "Review all of your submitted requests and their statuses.",
})

export default async function ClientRequestsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  cookies()

  const requests: RequestRow[] = await prisma.request.findMany({
    where: { clientId: session.user.id as string },
    orderBy: { eventDate: "desc" },
    select: {
      id: true,
      title: true,
      eventType: true,
      cuisineTypes: true,
      dietaryRequirements: true,
      eventDate: true,
      location: true,
      budget: true,
      currency: true,
      guestCount: true,
      _count: {
        select: {
          proposals: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6 lg:space-y-7">
      <div className="brand-surface rounded-[30px] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Requests</h1>
            <p className="text-sm text-muted-foreground">Manage and track your event requests.</p>
          </div>
          <Link href="/dashboard/client/create-request">
            <Button className="brand-gradient-button h-11 rounded-2xl px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
              Create Request
            </Button>
          </Link>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-[30px] border border-white/60 bg-white/72 py-12 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
              <ClipboardList className="h-9 w-9" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">No requests yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Create your first request to start receiving chef proposals.</p>
            <Link href="/dashboard/client/create-request" className="mt-6">
              <Button className="brand-gradient-button h-11 rounded-2xl px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                Create your first request
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-[26px] border border-white/60 bg-card/95 p-6 shadow-lg shadow-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10"
            >
              {/* Header with event type and status */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {request.eventType || "Event"}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs">
                      {request.status ?? "Pending"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {request.title || `${request.eventType || "Event"} Request`}
                  </h3>
                </div>
              </div>

              {/* Key details */}
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span className="truncate">{format(new Date(request.eventDate), "MMM d, yyyy · EEEE")}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{request.location}</span>
                </div>
                {request.guestCount > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>{request.guestCount} {request.eventType === "Cooking Class" ? "students" : "guests"}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-foreground">
                  <span className="text-sm text-muted-foreground">Budget</span>
                  <span className="font-medium">{formatCurrency(request.budget, request.currency)}</span>
                </div>
              </div>

              {/* Tags */}
              {(request.cuisineTypes || request.dietaryRequirements) ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {request.cuisineTypes && request.cuisineTypes.split(',').slice(0, 2).map((cuisine) => (
                    <Badge key={cuisine} variant="outline" className="text-xs">
                      <ChefHat className="h-3 w-3 mr-1" />
                      {cuisine.trim()}
                    </Badge>
                  ))}
                  {request.dietaryRequirements && request.dietaryRequirements.split(',').slice(0, 1).map((diet) => (
                    <Badge key={diet} variant="secondary" className="text-xs">
                      {diet.trim()}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {/* Footer with proposal count and action */}
              <div className="mt-5 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {request._count.proposals > 0
                    ? `${request._count.proposals} proposal${request._count.proposals > 1 ? "s" : ""}`
                    : "No proposals yet"}
                </div>
                <Link href={`/dashboard/client/requests/${request.id}`}>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
