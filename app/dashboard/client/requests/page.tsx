import { cookies } from "next/headers"
import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import {
  ClipboardList,
  ArrowRight,
  Calendar,
  MapPin,
  DollarSign,
  FilePlus2,
  MessageSquareText,
  CalendarCheck2,
} from "lucide-react"

import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type RequestRow = {
  id: string
  eventDate: string
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

  const cookieHeader = (await cookies()).toString()
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/requests`, {
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  })

  if (!response.ok) {
    redirect("/dashboard")
  }

  const payload: { requests: RequestRow[] } = await response.json().catch(() => ({ requests: [] }))
  const requests = payload.requests ?? []

  return (
    <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto py-10 px-6 bg-gradient-to-b from-white to-gray-50 rounded-b-2xl">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">My Requests</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track your event requests</p>
          </div>

          <Link href="/dashboard/client/create-request">
            <Button className="bg-black text-white rounded-xl px-5 h-10 hover:scale-[1.02] hover:shadow-md transition-all duration-200">
              Create Request
            </Button>
          </Link>
        </header>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 mx-auto mb-6 bg-gray-50 rounded-2xl flex items-center justify-center">
            <ClipboardList className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No requests yet</h2>
          <p className="text-sm text-gray-500 mb-6">Create your first request to get started</p>
          <Link href="/dashboard/client/create-request">
            <Button className="bg-black text-white rounded-xl px-5 h-10 hover:scale-[1.02] hover:shadow-md transition-all duration-200">
              Create your first request
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="font-semibold text-lg text-gray-900">
                  {format(new Date(request.eventDate), "MMM d, yyyy")}
                </div>
                <Badge 
                  className={`
                    ${
                      request.status === 'Approved' 
                        ? 'bg-green-100 text-green-700' 
                        : request.status === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    } rounded-full px-3 py-1 text-xs border-0`
                  }
                >
                  {request.status ?? "Pending"}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 text-sm">{request.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 text-sm">{format(new Date(request.eventDate), "EEEE")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900 text-sm">${request.budget.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4">
                <Link href="/dashboard/client/proposals">
                  <Button className="w-full bg-black text-white rounded-xl h-10 hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                    View proposals
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
