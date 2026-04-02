"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, ArrowRight } from "lucide-react"
import Link from "next/link"

interface ModernPerformanceProps {
  totalEarnings: number
  completedBookings: number
  activeBookings: number
  earningsData: Array<{ month: string; earnings: number }>
}

export function ModernPerformance({ 
  totalEarnings, 
  completedBookings, 
  earningsData 
}: ModernPerformanceProps) {
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
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalEarnings.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  {totalEarnings > 0 ? 'Positive trend' : 'No earnings yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Completed Bookings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completedBookings}
                </p>
                <p className="text-sm text-gray-600">
                  {completedBookings > 0 ? 'Growing' : 'No bookings yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completedBookings > 0 ? '4.8' : '-'}
                </p>
                <p className="text-sm text-gray-600">
                  {completedBookings > 0 ? 'Excellent' : 'No ratings yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Chart Section */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Earnings Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earningsData.length > 0 ? (
            <div className="h-64">
              {/* Enhanced bar chart visualization */}
              <div className="flex items-end justify-between h-full gap-3">
                {earningsData.slice(-6).map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 hover:to-blue-500 transition-colors duration-200" 
                         style={{ height: `${Math.max((item.earnings / Math.max(...earningsData.map(d => d.earnings))) * 100, 10)}%` }} />
                    <span className="text-xs text-gray-500 font-medium">{item.month.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No earnings data yet
              </h3>
              <p className="text-gray-600 mb-4">
                Complete your first booking to see earnings insights
              </p>
              <Link href="/dashboard/chef/requests">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                  Browse Requests
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
