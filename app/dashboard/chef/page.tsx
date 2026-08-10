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
import { getChefDashboardData, type ChefDashboardData } from "@/lib/chef-dashboard"
import { isPrismaConnectionError } from "@/lib/prisma"

export const metadata: Metadata = generateMeta({
  title: "Chef Dashboard",
  description: "Manage your chef profile, browse requests, and send proposals to clients.",
})

function getLocalChefDashboardData(): ChefDashboardData {
  const now = new Date()
  const addDays = (days: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + days)
    return date.toISOString()
  }

  return {
    totalEarnings: 4280,
    totalEarningsCurrency: "USD",
    earningsByCurrency: [{ currency: "USD", amount: 4280 }],
    activeBookings: 3,
    availableRequests: 4,
    completedBookings: 12,
    averageRating: 4.8,
    quotesSentToday: 2,
    menusCount: 3,
    menusTarget: 5,
    responseRate: 86,
    responseRateWindowDays: 7,
    responseRateSevenDay: 86,
    responseRateThirtyDay: 82,
    avgResponseTimeMinutes: 38,
    messageResponseRate: 86,
    proposalResponseRate: 58,
    requestsReceivedWeek: 7,
    proposalsSentWeek: 5,
    messageMetrics: {
      sevenDayTotal: 7,
      sevenDayResponded: 6,
      thirtyDayTotal: 22,
      thirtyDayResponded: 18,
    },
    profile: null,
    profileCompletion: 84,
    approvalStatus: "Local demo",
    requests: [
      {
        id: "local-request-anniversary",
        title: "Anniversary dinner for 10 guests",
        budget: 1450,
        currency: "USD",
        clientName: "Maya R.",
        location: "Downtown",
        createdAt: addDays(-1),
        eventDate: addDays(9),
        distanceKm: 6.4,
      },
      {
        id: "local-request-tasting",
        title: "Modern Italian tasting menu",
        budget: 2200,
        currency: "USD",
        clientName: "Daniel K.",
        location: "West End",
        createdAt: addDays(-2),
        eventDate: addDays(14),
        distanceKm: 11.2,
      },
      {
        id: "local-request-brunch",
        title: "Private family brunch",
        budget: 980,
        currency: "USD",
        clientName: "Avery P.",
        location: "Riverside",
        createdAt: addDays(-3),
        eventDate: addDays(6),
        distanceKm: 4.8,
      },
      {
        id: "local-request-corporate",
        title: "Executive chef's table",
        budget: 3100,
        currency: "USD",
        clientName: "Sutton Group",
        location: "Financial District",
        createdAt: addDays(-4),
        eventDate: addDays(18),
        distanceKm: 13.7,
      },
    ],
    proposals: [],
    bookings: [],
    experiences: [],
    reviews: [],
    earningsData: [
      { month: "Apr 2026", earnings: 3120, currency: "USD" },
      { month: "May 2026", earnings: 4280, currency: "USD" },
      { month: "Jun 2026", earnings: 1860, currency: "USD" },
    ],
    earningsTrend: [
      { date: "Jun 1", earnings: 0, currency: "USD" },
      { date: "Jun 2", earnings: 420, currency: "USD" },
      { date: "Jun 3", earnings: 0, currency: "USD" },
      { date: "Jun 4", earnings: 680, currency: "USD" },
      { date: "Jun 5", earnings: 0, currency: "USD" },
      { date: "Jun 6", earnings: 760, currency: "USD" },
      { date: "Jun 7", earnings: 0, currency: "USD" },
      { date: "Jun 8", earnings: 0, currency: "USD" },
      { date: "Jun 9", earnings: 540, currency: "USD" },
      { date: "Jun 10", earnings: 0, currency: "USD" },
      { date: "Jun 11", earnings: 0, currency: "USD" },
      { date: "Jun 12", earnings: 890, currency: "USD" },
      { date: "Jun 13", earnings: 0, currency: "USD" },
      { date: "Jun 14", earnings: 0, currency: "USD" },
    ],
    kpiTrends: [
      { date: "Jun 1", quotesSent: 1, proposalsAccepted: 0, proposalsRejected: 0, earnings: 0 },
      { date: "Jun 2", quotesSent: 2, proposalsAccepted: 1, proposalsRejected: 0, earnings: 420 },
      { date: "Jun 3", quotesSent: 0, proposalsAccepted: 0, proposalsRejected: 0, earnings: 0 },
      { date: "Jun 4", quotesSent: 2, proposalsAccepted: 1, proposalsRejected: 0, earnings: 680 },
      { date: "Jun 5", quotesSent: 1, proposalsAccepted: 0, proposalsRejected: 1, earnings: 0 },
      { date: "Jun 6", quotesSent: 3, proposalsAccepted: 1, proposalsRejected: 0, earnings: 760 },
      { date: "Jun 7", quotesSent: 0, proposalsAccepted: 0, proposalsRejected: 0, earnings: 0 },
      { date: "Jun 8", quotesSent: 1, proposalsAccepted: 0, proposalsRejected: 0, earnings: 0 },
      { date: "Jun 9", quotesSent: 2, proposalsAccepted: 1, proposalsRejected: 0, earnings: 540 },
      { date: "Jun 10", quotesSent: 1, proposalsAccepted: 0, proposalsRejected: 0, earnings: 0 },
      { date: "Jun 11", quotesSent: 0, proposalsAccepted: 0, proposalsRejected: 0, earnings: 0 },
      { date: "Jun 12", quotesSent: 2, proposalsAccepted: 1, proposalsRejected: 0, earnings: 890 },
      { date: "Jun 13", quotesSent: 1, proposalsAccepted: 0, proposalsRejected: 0, earnings: 0 },
      { date: "Jun 14", quotesSent: 2, proposalsAccepted: 0, proposalsRejected: 0, earnings: 0 },
    ],
    kpiSummary: {
      totalQuotesSent: 18,
      totalProposalsAccepted: 5,
      totalProposalsRejected: 1,
      totalEarnings: 4280,
      quotesTrend: 18,
      acceptanceRate: 27.8,
    },
    pendingTasks: [
      {
        id: "local-demo-profile",
        title: "Add two signature menus",
        description: "Round out your public profile with occasion-ready menus clients can compare quickly.",
        href: "/dashboard/chef/menus",
        priority: "medium",
      },
      {
        id: "local-demo-requests",
        title: "Review open requests",
        description: "Four nearby requests are ready for proposals once the database connection is restored.",
        href: "/dashboard/chef/requests",
        priority: "high",
      },
    ],
  }
}

export default async function ChefDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  if (!session.user?.id) {
    redirect("/dashboard")
  }

  let dashboardData: ChefDashboardData | null

  try {
    dashboardData = await getChefDashboardData(session.user.id)
  } catch (error) {
    if (isPrismaConnectionError(error) && process.env.NODE_ENV === "development") {
      dashboardData = getLocalChefDashboardData()
    } else {
    return <DashboardError error="Chef profile not found or dashboard data could not be loaded." />
    }
  }

  if (!dashboardData) {
    redirect("/dashboard/chef/profile")
  }

  const {
    totalEarnings = 0,
    totalEarningsCurrency = "GBP",
    earningsByCurrency = [],
    activeBookings = 0,
    availableRequests = 0,
    completedBookings = 0,
    averageRating = 0,
    quotesSentToday = 0,
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
          totalEarningsCurrency={totalEarningsCurrency}
          earningsByCurrency={earningsByCurrency}
        />

        <ChefStats
          availableRequests={availableRequests}
          quotesSentToday={quotesSentToday}
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
              totalEarningsCurrency={totalEarningsCurrency}
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
              totalEarningsCurrency={totalEarningsCurrency}
              earningsByCurrency={earningsByCurrency}
              completedBookings={completedBookings}
              earningsTrend={earningsTrend}
              averageRating={averageRating}
            />
          </div>

          <div className="space-y-6">
            {/* Daily Checklist - Business OS Core */}
            <DailyChecklist
              quotesSentToday={quotesSentToday}
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
