import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { authOptions } from "@/lib/auth"
import { PremiumHeroV3 } from "@/components/dashboard/chef/premium-hero-v3"
import { PremiumOpportunitiesV3 } from "@/components/dashboard/chef/premium-opportunities-v3"
import { PremiumQuickActionsV3 } from "@/components/dashboard/chef/premium-quick-actions-v3"
import { PremiumPerformanceV3 } from "@/components/dashboard/chef/premium-performance-v3"
import { PremiumStats } from "@/components/dashboard/chef/premium-stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardError } from "@/components/dashboard/chef/dashboard-error"
import { DashboardLoadingSkeleton } from "@/components/dashboard/chef/dashboard-loading-skeleton"
import Link from "next/link"

export const metadata: Metadata = generateMeta({
  title: "Chef Dashboard",
  description: "Manage your chef profile, browse requests, and send proposals to clients.",
})

export default async function ChefDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "CHEF") {
    redirect("/dashboard")
  }

  // Fetch dashboard data with single optimized API call
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

  const dashboardResponse = await fetch(`${baseUrl}/api/chef/dashboard`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  })

  let dashboardData: any = null
  let error: string | null = null

  if (dashboardResponse.ok) {
    dashboardData = await dashboardResponse.json()
  } else {
    error = "Failed to load dashboard data"
    console.error('Dashboard API error:', dashboardResponse.status)
  }

  // Fallback to individual APIs if dashboard endpoint fails
  if (!dashboardData) {
    const [requestsResponse, proposalsResponse, bookingsResponse, profileResponse, experiencesResponse, earningsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/requests`, {
        cache: "no-store",
        headers: { cookie: cookieHeader },
      }),
      fetch(`${baseUrl}/api/proposals`, {
        cache: "no-store", 
        headers: { cookie: cookieHeader },
      }),
      fetch(`${baseUrl}/api/bookings`, {
        cache: "no-store",
        headers: { cookie: cookieHeader },
      }),
      fetch(`${baseUrl}/api/chef/profile`, {
        cache: "no-store",
        headers: { cookie: cookieHeader },
      }),
      fetch(`${baseUrl}/api/experiences`, {
        cache: "no-store",
        headers: { cookie: cookieHeader },
      }),
      fetch(`${baseUrl}/api/analytics/earnings`, {
        cache: "no-store",
        headers: { cookie: cookieHeader },
      }),
    ])

    const requests = requestsResponse.ok ? ((await requestsResponse.json()) as { requests: any[] }).requests || [] : []
    const proposals = proposalsResponse.ok ? ((await proposalsResponse.json()) as { proposals: any[] }).proposals || [] : []
    const bookings = bookingsResponse.ok ? ((await bookingsResponse.json()) as { bookings: any[] }).bookings || [] : []
    const profile = profileResponse.ok ? await profileResponse.json() : null
    const experiences = experiencesResponse.ok ? await experiencesResponse.json() : []
    const earningsData = earningsResponse.ok ? await earningsResponse.json() : []

    // Calculate stats (fallback logic)
    const availableRequests = requests.length
    const sentProposals = proposals.length
    const activeBookings = bookings.filter(b => b.status !== "CANCELLED").length
    const completedBookings = bookings.filter(b => b.status === "COMPLETED").length
    const totalEarnings = bookings
      .filter(b => b.payments?.status === "COMPLETED")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0)
    const approvalStatus = profile?.isApproved ? "Approved" : "Pending"
    
    const profileCompletion = profile ? {
      hasProfile: true,
      hasBio: !!profile.bio,
      hasExperience: !!profile.experience,
      hasLocation: !!profile.location,
      hasExperiences: experiences.length > 0,
      hasAvailability: true
    } : { hasProfile: false, hasBio: false, hasExperience: false, hasLocation: false, hasExperiences: false, hasAvailability: false }
    
    const completionPercentage = Object.values(profileCompletion).filter(Boolean).length / Object.keys(profileCompletion).length * 100

    dashboardData = {
      totalEarnings,
      activeBookings,
      availableRequests,
      completedBookings,
      averageRating: 4.8, // Fallback rating
      profile,
      profileCompletion: completionPercentage,
      approvalStatus,
      requests,
      proposals,
      bookings,
      experiences,
      earningsData
    }
  }

  // Return error state if dashboard data failed to load
  if (error && !dashboardData) {
    return (
      <DashboardError 
        error={error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  // Return loading state (though this shouldn't happen in server components)
  if (!dashboardData) {
    return <DashboardLoadingSkeleton />
  }

  // Extract data for components
  const {
    totalEarnings = 0,
    activeBookings = 0,
    availableRequests = 0,
    completedBookings = 0,
    averageRating = 0,
    profileCompletion = 0,
    requests = [],
    earningsData = [],
    earningsTrend = []
  } = dashboardData

  const completionPercentage = profileCompletion

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-8 space-y-10">
        {/* Premium Hero Section */}
        <PremiumHeroV3
          userName={session?.user?.name || ''}
          completionPercentage={completionPercentage}
          availableRequests={availableRequests}
        />

        {/* Premium Stats Cards */}
        <PremiumStats
          totalEarnings={totalEarnings}
          activeBookings={activeBookings}
          availableRequests={availableRequests}
        />
      
        {/* Premium Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-10">
            {/* Premium Opportunities - Main Focus */}
            <PremiumOpportunitiesV3
              requests={requests}
              availableRequestsCount={availableRequests}
            />
            
            {/* Premium Performance Section */}
            <PremiumPerformanceV3
              totalEarnings={totalEarnings}
              completedBookings={completedBookings}
              earningsData={earningsData}
              earningsTrend={earningsTrend}
              averageRating={averageRating}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <PremiumQuickActionsV3
                availableRequests={availableRequests}
                activeBookings={activeBookings}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
