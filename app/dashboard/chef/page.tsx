import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { ChefActionPanel } from "@/components/dashboard/chef/chef-action-panel"
import { ChefHero } from "@/components/dashboard/chef/chef-hero"
import { ChefOpportunities } from "@/components/dashboard/chef/chef-opportunities"
import { ChefPerformance } from "@/components/dashboard/chef/chef-performance"
import { ChefStats } from "@/components/dashboard/chef/chef-stats"
import { DashboardError } from "@/components/dashboard/chef/dashboard-error"
import { getChefDashboardData } from "@/lib/chef-dashboard"

export const metadata: Metadata = generateMeta({
  title: "Chef Dashboard",
  description: "Manage your chef profile, browse requests, and send proposals to clients.",
})

export default async function ChefDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  if (!session.user?.id) {
    redirect("/dashboard")
  }

  let dashboardData

  try {
    dashboardData = await getChefDashboardData(session.user.id)
  } catch (error) {
    return <DashboardError error="Chef profile not found or dashboard data could not be loaded." />
  }

  if (!dashboardData) {
    redirect("/dashboard/chef/profile")
  }

  const {
    totalEarnings = 0,
    activeBookings = 0,
    availableRequests = 0,
    completedBookings = 0,
    averageRating = 0,
    profileCompletion = 0,
    requests = [],
    earningsTrend = [],
    pendingTasks = [],
  } = dashboardData

  return (
    <div className="space-y-6 lg:space-y-7">
        <ChefHero
          userName={session?.user?.name || ""}
          activeBookings={activeBookings}
          availableRequests={availableRequests}
          totalEarnings={totalEarnings}
        />

        <ChefStats
          activeBookings={activeBookings}
          availableRequests={availableRequests}
          totalEarnings={totalEarnings}
          completedBookings={completedBookings}
          averageRating={averageRating}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <ChefOpportunities
              requests={requests}
              availableRequestsCount={availableRequests}
            />

            <ChefPerformance
              totalEarnings={totalEarnings}
              completedBookings={completedBookings}
              earningsTrend={earningsTrend}
              averageRating={averageRating}
            />
          </div>

          <div className="space-y-6">
            <ChefActionPanel
              profileCompletion={profileCompletion}
              pendingTasks={pendingTasks}
              availableRequests={availableRequests}
              activeBookings={activeBookings}
            />
          </div>
        </div>
    </div>
  )
}
