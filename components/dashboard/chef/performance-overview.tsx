"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Calendar, Star, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

interface PerformanceOverviewProps {
  totalEarnings: number
  completedBookings: number
  activeBookings: number
  earningsData: Array<{ month: string; earnings: number }>
  bookingsData?: Array<{ month: string; bookings: number }>
}

export function PerformanceOverview({ 
  totalEarnings, 
  completedBookings, 
  activeBookings, 
  earningsData,
  bookingsData = []
}: PerformanceOverviewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate trend from earnings data
  const calculateTrend = (data: Array<{ month: string; earnings: number }>) => {
    if (data.length < 2) return { trend: 'neutral', value: 0 }
    
    const recent = data.slice(-2)
    const change = recent[1].earnings - recent[0].earnings
    const percentage = recent[0].earnings > 0 ? (change / recent[0].earnings) * 100 : 0
    
    if (change > 0) return { trend: 'up', value: Math.abs(percentage) }
    if (change < 0) return { trend: 'down', value: Math.abs(percentage) }
    return { trend: 'neutral', value: 0 }
  }

  const earningsTrend = calculateTrend(earningsData)
  
  // Generate sample booking data if not provided
  const sampleBookingsData = earningsData.map(item => ({
    month: item.month,
    bookings: Math.floor(Math.random() * 10) + 1
  }))

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'down': return <TrendingDown className="h-3 w-3 text-red-600" />
      default: return <Minus className="h-3 w-3 text-gray-400" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }

  if (!mounted) {
    return (
      <section className="space-y-8">
        <div className="animate-pulse">
          <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">Performance Overview</h2>
          <p className="text-gray-600 dark:text-gray-300">Track your key metrics and earnings</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Performance Overview
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Track your key metrics and earnings
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Earnings Card */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-400 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          <Card className="relative border-0 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                {earningsTrend.trend !== 'neutral' && (
                  <div className={`flex items-center text-sm font-medium ${getTrendColor(earningsTrend.trend)}`}>
                    {getTrendIcon(earningsTrend.trend)}
                    <span className="ml-1">
                      {earningsTrend.value > 0 ? `${earningsTrend.value.toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                ${totalEarnings.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Total Earnings
              </p>
              
              {/* Mini Chart */}
              {earningsData.length > 0 && (
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={earningsData.slice(-6)}>
                      <Line
                        type="monotone"
                        dataKey="earnings"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Completed Bookings Card */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          <Card className="relative border-0 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                {activeBookings > 0 && (
                  <Badge className="bg-blue-100 text-blue-600 border-blue-200">
                    {activeBookings} active
                  </Badge>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {completedBookings}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Completed Bookings
              </p>
              
              {/* Mini Chart */}
              {sampleBookingsData.length > 0 && (
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sampleBookingsData.slice(-6)}>
                      <Bar dataKey="bookings" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Average Rating Card */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          <Card className="relative border-0 shadow-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
                  <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                {completedBookings > 0 && (
                  <Badge className="bg-purple-100 text-purple-600 border-purple-200">
                    Verified
                  </Badge>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {completedBookings > 0 ? '4.8' : '-'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Average Rating
              </p>
              
              {/* Rating Stars */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= 4
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                {completedBookings > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({completedBookings} reviews)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Detailed Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Earnings Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {earningsData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs text-gray-500 dark:text-gray-400"
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis 
                      className="text-xs text-gray-500 dark:text-gray-400"
                      tick={{ fill: 'currentColor' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value}`, 'Earnings']}
                    />
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                <div className="text-gray-500 dark:text-gray-400">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No earnings yet</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Complete your first booking to see earnings trends
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings Chart */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Booking Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sampleBookingsData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sampleBookingsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs text-gray-500 dark:text-gray-400"
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis 
                      className="text-xs text-gray-500 dark:text-gray-400"
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [value, 'Bookings']}
                    />
                    <Bar
                      dataKey="bookings"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                <div className="text-gray-500 dark:text-gray-400">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No booking activity</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Start accepting bookings to see activity trends
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
