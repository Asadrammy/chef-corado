"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

interface EngagingPerformanceProps {
  totalEarnings: number
  completedBookings: number
  activeBookings: number
  earningsData: Array<{ month: string; earnings: number }>
}

export function EngagingPerformance({ 
  totalEarnings, 
  completedBookings, 
  earningsData 
}: EngagingPerformanceProps) {
  return (
    <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-8">
        <div className="space-y-4">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <BarChart3 className="h-6 w-6" />
            </div>
            Performance Overview
          </CardTitle>
          <p className="text-lg text-gray-600">
            Track your progress and grow your business
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-10">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">💰 Earnings</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${totalEarnings.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 italic">
                  {totalEarnings > 0 ? 'You\'re earning great!' : 'You haven\'t started earning yet'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">📅 Bookings</p>
                <p className="text-3xl font-bold text-gray-900">
                  {completedBookings}
                </p>
                <p className="text-sm text-gray-600 italic">
                  {completedBookings > 0 ? `You have ${completedBookings} completed` : 'Complete your first booking'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">⭐ Rating</p>
                <p className="text-3xl font-bold text-gray-900">
                  {completedBookings > 0 ? '4.8' : '-'}
                </p>
                <p className="text-sm text-gray-600 italic">
                  {completedBookings > 0 ? 'Excellent work!' : 'Your ratings will appear here'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chart Section */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-2xl p-8">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Earnings Trend
            </h3>
            
            {earningsData.length > 0 ? (
              <div className="h-64">
                {/* Enhanced bar chart visualization */}
                <div className="flex items-end justify-between h-full gap-4">
                  {earningsData.slice(-6).map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-3">
                      <div className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 hover:to-blue-500 transition-all duration-300 hover:scale-105" 
                           style={{ height: `${Math.max((item.earnings / Math.max(...earningsData.map(d => d.earnings))) * 100, 10)}%` }} />
                      <span className="text-xs text-gray-500 font-medium">{item.month.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">
                  Complete your first booking to unlock insights
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  Start earning to see your performance trends and analytics
                </p>
                <Link href="/dashboard/chef/requests">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] text-lg font-medium">
                    Browse Requests
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
