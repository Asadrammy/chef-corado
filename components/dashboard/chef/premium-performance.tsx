"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Calendar, Star, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import Link from "next/link"

interface PremiumPerformanceProps {
  totalEarnings: number
  completedBookings: number
  activeBookings: number
  earningsData: Array<{ month: string; earnings: number }>
}

export function PremiumPerformance({ 
  totalEarnings, 
  completedBookings, 
  activeBookings, 
  earningsData 
}: PremiumPerformanceProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate trend from earnings data
  const calculateTrend = (data: Array<{ month: string; earnings: number }>) => {
    if (data.length < 2) return { direction: 'neutral' as const, value: 0 }
    
    const recent = data.slice(-2)
    const change = recent[1].earnings - recent[0].earnings
    const percentage = recent[0].earnings > 0 ? (change / recent[0].earnings) * 100 : 0
    
    if (change > 0) return { direction: 'up' as const, value: Math.abs(percentage) }
    if (change < 0) return { direction: 'down' as const, value: Math.abs(percentage) }
    return { direction: 'neutral' as const, value: 0 }
  }

  const earningsTrend = calculateTrend(earningsData)
  const bookingTrend = completedBookings > 0 ? { direction: 'up' as const, value: 12 } : { direction: 'neutral' as const, value: 0 }

  if (!mounted) {
    return (
      <section className="space-y-8">
        <div className="animate-pulse">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Performance Overview</h2>
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
      
      {/* Premium Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Earnings */}
        <StatCard
          title="Total Earnings"
          value={`$${totalEarnings.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
          trend={earningsTrend}
          highlight={totalEarnings > 0}
          color="green"
        />
        
        {/* Completed Bookings */}
        <StatCard
          title="Completed Bookings"
          value={completedBookings}
          icon={<Calendar className="h-6 w-6" />}
          trend={bookingTrend}
          highlight={completedBookings > 0}
          color="blue"
        />
        
        {/* Average Rating */}
        <StatCard
          title="Average Rating"
          value={completedBookings > 0 ? '4.8' : 'No ratings yet'}
          icon={<Star className="h-6 w-6" />}
          color={completedBookings > 0 ? 'purple' : 'blue'}
        />
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Earnings Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {earningsData.length > 0 ? (
              <div className="h-64">
                {/* Simple bar chart visualization */}
                <div className="flex items-end justify-between h-full gap-2">
                  {earningsData.slice(-6).map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t" 
                           style={{ height: `${Math.max((item.earnings / Math.max(...earningsData.map(d => d.earnings))) * 100, 10)}%` }} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.month.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <BarChart3 className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No earnings data yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Complete your first booking to unlock earnings insights
                </p>
                <Link href="/dashboard/chef/requests">
                  <Button size="sm" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                    Browse Requests
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Insights & Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedBookings === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Ready to grow your business?
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Complete your first booking to unlock personalized insights and performance analytics
                  </p>
                  <div className="space-y-2 text-left text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Track your earnings over time</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>Monitor booking trends</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span>Build your rating profile</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">Great start! 🎉</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      You've completed {completedBookings} booking{completedBookings > 1 ? 's' : ''}. Keep up the excellent work!
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Pro tip</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Clients with detailed profiles get 3x more bookings. Consider adding more photos to your experiences.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-1">Next milestone</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Complete {5 - completedBookings} more bookings to unlock the "Experienced Chef" badge.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
