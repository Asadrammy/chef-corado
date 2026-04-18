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
  DollarSign,
} from "lucide-react"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type RequestRow = {
  id: string
  eventDate: Date
  location: string
  budget: number
  status?: string
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
      eventDate: true,
      location: true,
      budget: true,
    },
  })

  return (
    <div className="space-y-6 lg:space-y-7">
      <div className="rounded-[30px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] px-6 py-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Requests</h1>
            <p className="text-sm text-muted-foreground">Manage and track your event requests.</p>
          </div>
          <Link href="/dashboard/client/create-request">
            <Button className="h-11 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
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
              <Button className="h-11 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
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
              <div className="flex items-start justify-between gap-4">
                <div className="font-semibold text-lg text-foreground">
                  {format(new Date(request.eventDate), "MMM d, yyyy")}
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {request.status ?? "Pending"}
                </Badge>
              </div>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{request.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(request.eventDate), "EEEE")}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">${request.budget.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-5">
                <Link href="/dashboard/client/proposals">
                  <Button className="w-full rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                    View proposals
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
