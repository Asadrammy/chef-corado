import { Metadata } from "next"
import { generateMeta } from "@/lib/utils"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { authOptions } from "@/lib/auth"
import { MarketplaceMetrics } from "@/components/dashboard/MarketplaceMetrics"
import { RecentBookings } from "@/components/dashboard/RecentBookings"
import { PlatformAnalytics } from "@/components/platform-analytics"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Calendar, DollarSign, ChefHat, ArrowRight } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = generateMeta({
  title: "Admin Dashboard",
  description: "Keep the marketplace healthy by approving chefs, monitoring bookings, and managing payouts.",
})

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Fetch real data for dashboard
  const cookieHeader = (await cookies()).toString()
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

  // Fetch admin data
  const [chefsResponse, bookingsResponse, paymentsResponse] = await Promise.all([
    fetch(`${baseUrl}/api/admin/chefs`, {
      cache: "no-store",
      headers: { cookie: cookieHeader },
    }),
    fetch(`${baseUrl}/api/admin/bookings`, {
      cache: "no-store", 
      headers: { cookie: cookieHeader },
    }),
    fetch(`${baseUrl}/api/admin/payments`, {
      cache: "no-store",
      headers: { cookie: cookieHeader },
    }),
  ])

  const chefs = chefsResponse.ok ? await chefsResponse.json() : []
  const bookings = bookingsResponse.ok ? await bookingsResponse.json() : []
  const payments = paymentsResponse.ok ? await paymentsResponse.json() : []

  // Calculate stats
  const totalChefs = chefs.length
  const pendingChefs = chefs.filter((c: any) => !c.isApproved).length
  const totalBookings = bookings.length
  const activeBookings = bookings.filter((b: any) => b.status === "CONFIRMED").length
  const totalRevenue = payments
    .filter((p: any) => p.status === "COMPLETED")
    .reduce((sum: number, p: any) => sum + p.commission, 0)
  const pendingPayouts = payments.filter((p: any) => p.status === "PENDING").length

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <header className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          <p className="text-sm uppercase tracking-[0.4em] text-gray-500 dark:text-gray-400 font-medium">Admin Workspace</p>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white mb-4">
          Welcome back, Admin
        </h1>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl mb-8">
          Manage your marketplace with powerful tools. Monitor performance, approve chefs, and ensure platform health.
        </p>
        <div className="flex items-center gap-4">
          <Button className="shadow-sm hover:shadow-md">
            <ArrowRight className="mr-2 h-4 w-4" />
            View Analytics
          </Button>
          <Button variant="outline" className="border-gray-200 dark:border-gray-700">
            Quick Tour
          </Button>
        </div>
      </header>

      {/* Stats Overview */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-hover bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="icon-bg">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-green-600">+12%</span>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{totalChefs}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Total Chefs</p>
        </div>
        
        <div className="card-hover bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="icon-bg">
              <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-green-600">+8%</span>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{activeBookings}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Active Bookings</p>
        </div>
        
        <div className="card-hover bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="icon-bg">
              <DollarSign className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-green-600">+15%</span>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">${totalRevenue.toFixed(0)}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Platform Revenue</p>
        </div>
        
        <div className="card-hover bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="icon-bg">
              <ChefHat className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
              {pendingChefs}
            </Badge>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Pending</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Chef Approvals</p>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Analytics Overview</h2>
            <p className="text-gray-600 dark:text-gray-300">Monitor platform performance and trends</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MarketplaceMetrics />
          <div className="lg:col-span-2">
            <PlatformAnalytics />
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
            <p className="text-gray-600 dark:text-gray-300">Manage your admin tasks efficiently</p>
          </div>
        </div>
        <div className="card-hover bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Admin Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/dashboard/admin/chefs">
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Manage Chefs</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Approve chefs</p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">{pendingChefs} pending</Badge>
              </div>
            </Link>

            <Link href="/dashboard/admin/bookings">
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-900/20">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">All Bookings</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Monitor activity</p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">{activeBookings} active</Badge>
              </div>
            </Link>

            <Link href="/dashboard/admin/payments">
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-50 dark:bg-green-900/20">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Payments</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Release payouts</p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">{pendingPayouts} pending</Badge>
              </div>
            </Link>

            <Link href="/dashboard/admin/chefs">
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-900/20">
                    <ChefHat className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Total Revenue</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Commission earned</p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">${totalRevenue.toFixed(0)}</Badge>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Bookings Table - Full Width */}
      <section className="w-full">
        <RecentBookings />
      </section>
    </div>
  )
}
