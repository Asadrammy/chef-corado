"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PerformanceSectionProps {
  totalEarnings: number
  completedBookings: number
  earningsData: Array<{ month: string; earnings: number }>
}

export function PerformanceSection({ totalEarnings, completedBookings, earningsData }: PerformanceSectionProps) {
  // Only show if user has earnings or completed bookings
  if (totalEarnings === 0 && completedBookings === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-16 text-center">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Start your first booking to unlock insights
              </h3>
              <p className="text-gray-600">
                Complete bookings to see your performance trends and analytics
              </p>
            </div>
            
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                Browse Requests
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4">
            <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900">
              ${totalEarnings.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-4">
            <p className="text-sm text-gray-500 mb-1">Completed Bookings</p>
            <p className="text-2xl font-bold text-gray-900">
              {completedBookings}
            </p>
          </div>
          <div className="text-center p-4">
            <p className="text-sm text-gray-500 mb-1">Average Rating</p>
            <p className="text-2xl font-bold text-gray-900">
              {completedBookings > 0 ? '4.8' : '-'}
            </p>
          </div>
        </div>
        
        {/* Chart Section */}
        {earningsData.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Earnings Trend</h4>
            <div className="h-48">
              <div className="flex items-end justify-between h-full gap-2">
                {earningsData.slice(-6).map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-blue-600 rounded-t" 
                         style={{ height: `${Math.max((item.earnings / Math.max(...earningsData.map(d => d.earnings))) * 100, 10)}%` }} />
                    <span className="text-xs text-gray-500">{item.month.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
