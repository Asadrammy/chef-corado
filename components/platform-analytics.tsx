"use client"

import * as React from "react"
import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Calendar, Users, TrendingUp } from "lucide-react"

interface RevenueData {
  date: string
  revenue: number
}

interface BookingsData {
  date: string
  count: number
}

interface UsersData {
  date: string
  newUsers: number
}

interface AnalyticsResponse {
  data: RevenueData[] | BookingsData[] | UsersData[]
  summary: {
    totalRevenue?: number
    averageDailyRevenue?: number
    daysWithRevenue?: number
    totalPayments?: number
    totalBookings?: number
    averageDailyBookings?: number
    daysWithBookings?: number
    totalBookingValue?: number
    statusBreakdown?: Record<string, number>
    typeBreakdown?: Record<string, number>
    totalNewUsers?: number
    averageDailyUsers?: number
    daysWithNewUsers?: number
    roleBreakdown?: Record<string, number>
    totalPlatformUsers?: number
  }
}

export function PlatformAnalytics() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [bookingsData, setBookingsData] = useState<BookingsData[]>([])
  const [usersData, setUsersData] = useState<UsersData[]>([])
  const [revenueSummary, setRevenueSummary] = useState<any>({})
  const [bookingsSummary, setBookingsSummary] = useState<any>({})
  const [usersSummary, setUsersSummary] = useState<any>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("revenue")

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true)
        
        // Fetch all analytics data
        const [revenueRes, bookingsRes, usersRes] = await Promise.all([
          fetch('/api/admin/analytics/revenue?days=30'),
          fetch('/api/admin/analytics/bookings?days=30'),
          fetch('/api/admin/analytics/users?days=30')
        ])

        if (revenueRes.ok) {
          const revenue: AnalyticsResponse = await revenueRes.json()
          setRevenueData(revenue.data as RevenueData[])
          setRevenueSummary(revenue.summary)
        }

        if (bookingsRes.ok) {
          const bookings: AnalyticsResponse = await bookingsRes.json()
          setBookingsData(bookings.data as BookingsData[])
          setBookingsSummary(bookings.summary)
        }

        if (usersRes.ok) {
          const users: AnalyticsResponse = await usersRes.json()
          setUsersData(users.data as UsersData[])
          setUsersSummary(users.summary)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-light text-gray-900 dark:text-white">
            Platform Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Check if all data is empty
  const hasNoData = revenueData.length === 0 && bookingsData.length === 0 && usersData.length === 0

  if (hasNoData) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-light text-gray-900 dark:text-white">
            Platform Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-gray-500 dark:text-gray-400">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No analytics data yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Platform activity will appear here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Revenue' ? `$${entry.value.toFixed(2)}` : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-light text-gray-900 dark:text-white">
            Platform Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Last 30 days
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  ${revenueSummary.totalRevenue?.toFixed(0) || '0'}
                </p>
                <p className="text-xs text-gray-500">Total Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  ${revenueSummary.averageDailyRevenue?.toFixed(0) || '0'}
                </p>
                <p className="text-xs text-gray-500">Daily Average</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {revenueSummary.daysWithRevenue || '0'}
                </p>
                <p className="text-xs text-gray-500">Active Days</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  />
                  <YAxis 
                    className="text-xs text-gray-500 dark:text-gray-400"
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {bookingsSummary.totalBookings || '0'}
                </p>
                <p className="text-xs text-gray-500">Total Bookings</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {bookingsSummary.averageDailyBookings?.toFixed(1) || '0'}
                </p>
                <p className="text-xs text-gray-500">Daily Average</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  ${bookingsSummary.totalBookingValue?.toFixed(0) || '0'}
                </p>
                <p className="text-xs text-gray-500">Total Value</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bookingsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  />
                  <YAxis 
                    className="text-xs text-gray-500 dark:text-gray-400"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 3 }}
                    name="Bookings"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {usersSummary.totalNewUsers || '0'}
                </p>
                <p className="text-xs text-gray-500">New Users</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {usersSummary.totalPlatformUsers || '0'}
                </p>
                <p className="text-xs text-gray-500">Total Users</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {usersSummary.averageDailyUsers?.toFixed(1) || '0'}
                </p>
                <p className="text-xs text-gray-500">Daily Average</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usersData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  />
                  <YAxis 
                    className="text-xs text-gray-500 dark:text-gray-400"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="newUsers"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 3 }}
                    name="New Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
