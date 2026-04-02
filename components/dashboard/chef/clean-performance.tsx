"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import Link from "next/link"

interface CleanPerformanceProps {
  totalEarnings: number
  completedBookings: number
  activeBookings: number
  earningsData: Array<{ month: string; earnings: number }>
}

export function CleanPerformance({ 
  totalEarnings, 
  completedBookings, 
  earningsData 
}: CleanPerformanceProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Performance Overview
        </h2>
        <p className="text-gray-600">
          Track your key metrics and earnings
        </p>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalEarnings.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                {totalEarnings > 0 ? 'Positive trend' : 'No earnings yet'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Completed Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {completedBookings}
              </p>
              <p className="text-sm text-gray-600">
                {completedBookings > 0 ? 'Growing' : 'No bookings yet'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 rounded-xl">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {completedBookings > 0 ? '4.8' : '-'}
              </p>
              <p className="text-sm text-gray-600">
                {completedBookings > 0 ? 'Excellent' : 'No ratings yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart Section */}
      <Card className="border border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
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
                    <div className="w-full bg-blue-600 rounded-t" 
                         style={{ height: `${Math.max((item.earnings / Math.max(...earningsData.map(d => d.earnings))) * 100, 10)}%` }} />
                    <span className="text-xs text-gray-500">{item.month.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No earnings data yet
              </h3>
              <p className="text-gray-600 mb-4">
                Complete your first booking to see earnings insights
              </p>
              <Link href="/dashboard/chef/requests">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Browse Requests
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
