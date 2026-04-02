import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"

import { authOptions } from "@/lib/auth"
import { generateMeta } from "@/lib/utils"
import { ClientBookingsList } from "@/components/client-bookings-list"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = generateMeta({
  title: "Client Bookings",
  description: "Track your upcoming and past private chef bookings.",
})

export default async function ClientBookingsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CLIENT") {
    redirect("/dashboard")
  }

  cookies()

  return (
    <div className="space-y-10 py-2">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-slate-500">Client Workspace</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Your Bookings</h1>
          <p className="max-w-2xl text-base text-slate-600">
            Manage upcoming events, track status, and stay in control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="h-11 rounded-xl px-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <Link href="/dashboard/client/create-request">Create Request</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-xl border-slate-200 bg-white px-5 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
          >
            <Link href="/experiences">Browse Chefs</Link>
          </Button>
        </div>
      </header>

      <ClientBookingsList />
    </div>
  )
}
