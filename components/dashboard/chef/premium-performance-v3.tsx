"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PremiumPerformanceProps {
  totalEarnings: number
  completedBookings: number
  earningsData: Array<{ month: string; earnings: number }>
  earningsTrend?: Array<{ date: string; earnings: number }>
  averageRating?: number
}

export function PremiumPerformanceV3({ totalEarnings, completedBookings, earningsData, earningsTrend = [], averageRating = 0 }: PremiumPerformanceProps) {
  // Only show if user has earnings or completed bookings
  if (totalEarnings === 0 && completedBookings === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-blue-50 border-0 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-16 text-center">
          <div className="space-y-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
              {/* Decorative rings */}
              <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20 blur-xl animate-pulse" />
            </div>
            
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Complete your first booking to unlock insights
              </h3>
              <p className="text-lg text-gray-600">
                Start earning to see your performance trends and analytics
              </p>
            </div>
            
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-lg font-medium">
                Browse Requests
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-0 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-8">
        <div className="space-y-4">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <BarChart3 className="h-7 w-7" />
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
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${totalEarnings.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Completed Bookings</p>
                <p className="text-3xl font-bold text-gray-900">
                  {completedBookings}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900">
                  {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chart Section */}
        {earningsTrend.length > 0 && (
          <div className="bg-white border-0 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 p-10">
            <div className="space-y-8">
              {/* Header with stat */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    Earnings Trend
                  </h4>
                  <p className="text-sm text-gray-500 mt-1 ml-11">Showing last 14 days performance</p>
                </div>
                {(() => {
                  const daysWithEarnings = earningsTrend.filter(d => d.earnings > 0).length;
                  return daysWithEarnings > 1 && (
                    <div className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      <TrendingUp className="h-4 w-4" />
                      +12% from last week
                    </div>
                  );
                })()}
              </div>
              
              {/* Modern Chart */}
              <div className="h-96 relative">
                <div className="absolute inset-0">
                  {/* Soft Grid */}
                  <div className="absolute inset-0 flex flex-col justify-between opacity-30">
                    {[0, 25, 50, 75, 100].map((percent, index) => (
                      <div key={index} className="w-full border-t border-gray-200" />
                    ))}
                  </div>
                  
                  {/* Bars Container */}
                  <div className="flex items-end justify-between h-full gap-3 px-6 pb-12 relative">
                    {/* Only show bars where earnings > 0 */}
                    {earningsTrend.map((item, index) => {
                      const earnings = Number(item?.earnings) || 0;
                      if (earnings === 0) return null; // Skip zero earnings days
                      
                      const maxEarnings = Math.max(...earningsTrend.map(d => Number(d?.earnings) || 0), 1);
                      const heightPercentage = maxEarnings > 0 ? (earnings / maxEarnings) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end animate-fade-in">
                          <div 
                            className="w-full bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-xl transition-all duration-500 hover:scale-105 hover:shadow-xl hover:from-blue-700 hover:to-purple-600 relative group"
                            style={{ 
                              height: `${Math.max(heightPercentage, 25)}%`,
                              minHeight: '40px',
                              animation: `growIn 0.6s ease-out ${index * 0.1}s both`
                            }}
                          >
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                              <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                                <div className="font-semibold">{item?.date}</div>
                                <div className="text-blue-300">${earnings.toFixed(0)}</div>
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 font-medium text-center mt-3">
                            {item?.date?.split(' ')[1] || item?.date || ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Clean Y-axis */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-10 pb-12 font-medium">
                    <span>$1.3k</span>
                    <span>$1k</span>
                    <span>$500</span>
                    <span>$0</span>
                  </div>
                  
                  {/* Clean Baseline */}
                  <div className="absolute bottom-12 left-0 right-0 h-px bg-gray-300"></div>
                </div>
                
                {/* Minimal Legend */}
                <div className="flex justify-center mt-6">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-3 h-3 bg-gradient-to-t from-blue-600 to-purple-500 rounded-full"></div>
                    <span>Daily Earnings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for no trend data */}
        {earningsTrend.length === 0 && totalEarnings > 0 && (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-2xl p-8">
            <div className="text-center space-y-4">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto" />
              <h4 className="text-lg font-semibold text-gray-900">Earnings Trend</h4>
              <p className="text-gray-600">No recent earnings data to display</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
