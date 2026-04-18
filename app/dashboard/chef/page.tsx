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
import { DailyChecklist } from "@/components/dashboard/chef/daily-checklist"
import { RevenueIntelligence } from "@/components/dashboard/chef/revenue-intelligence"
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
    quotesSentToday = 0,
    quotesTarget = 10,
    menusCount = 0,
    menusTarget = 5,
    responseRate = 0,
    responseRateWindowDays = 7,
    messageResponseRate = 0,
    proposalResponseRate = 0,
    requestsReceivedWeek = 0,
    proposalsSentWeek = 0,
    messageMetrics,
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
          availableRequests={availableRequests}
          quotesSentToday={quotesSentToday}
          quotesTarget={quotesTarget}
          menusCount={menusCount}
          menusTarget={menusTarget}
          responseRate={responseRate}
          responseRateWindowDays={responseRateWindowDays}
          messageResponseRate={messageResponseRate}
          proposalResponseRate={proposalResponseRate}
          requestsReceivedWeek={requestsReceivedWeek}
          proposalsSentWeek={proposalsSentWeek}
          messageMetrics={messageMetrics}
        />

        {/* Business OS Section */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {/* Revenue Intelligence - Premium Feature */}
            <RevenueIntelligence
              totalEarnings={totalEarnings}
              earningsTrend={earningsTrend}
              completedBookings={completedBookings}
              activeBookings={activeBookings}
              monthlyGoal={5000}
            />

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
            {/* Daily Checklist - Business OS Core */}
            <DailyChecklist
              quotesSentToday={quotesSentToday}
              quotesTarget={quotesTarget}
              responseRate={responseRate}
              availableRequests={availableRequests}
              activeBookings={activeBookings}
              messageResponseRate={messageResponseRate}
              proposalResponseRate={proposalResponseRate}
            />

            <ChefActionPanel
              profileCompletion={profileCompletion}
              pendingTasks={pendingTasks}
              availableRequests={availableRequests}
              activeBookings={activeBookings}
              quotesSentToday={quotesSentToday}
              quotesTarget={quotesTarget}
              menusCount={menusCount}
              menusTarget={menusTarget}
              responseRate={responseRate}
              responseRateWindowDays={responseRateWindowDays}
            />
          </div>
        </div>
    </div>
  )
}
