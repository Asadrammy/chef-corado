import { Metadata } from "next"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { generateMeta } from "@/lib/utils"
import { ChefBookingsDashboard } from "@/components/chef-bookings-dashboard"

export const metadata: Metadata = generateMeta({
  title: "Bookings",
  description: "Manage your confirmed events and track status",
})

export default async function ChefBookingsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  cookies()

  return (
    <div className="bg-gray-50 min-h-screen">
      <ChefBookingsDashboard />
    </div>
  )
}
