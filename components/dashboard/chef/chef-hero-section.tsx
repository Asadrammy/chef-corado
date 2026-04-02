"use client"

import { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChefHat, FileText, Calendar, DollarSign, ArrowRight, TrendingUp, Users, MapPin } from "lucide-react"
import Link from "next/link"

interface ChefHeroSectionProps {
  userName: string
  totalEarnings: number
  activeBookings: number
  availableRequests: number
  completedBookings: number
  completionPercentage: number
}

export function ChefHeroSection({ 
  userName, 
  totalEarnings, 
  activeBookings, 
  availableRequests, 
  completedBookings,
  completionPercentage 
}: ChefHeroSectionProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-80 animate-pulse bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-3xl" />
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient with glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950 dark:via-gray-900 dark:to-purple-950">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTYzIDM0di00aC0ydjRoLTRoMnY0aDJ2LTRoNHYtMmgtNHptMC0zMFYwaC0ydjRoLTRoMnY0aDJWNmg0VjRoLTR6TTYgMzR2LTRINHY0SDBoMnY0aDJ2LTRoNHYtMkg2ek02IDRWMGg0djRIMHYyaDR2NGgyVjZoNFY0SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
      </div>
      
      {/* Glassmorphism card */}
      <Card className="relative border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-8 lg:p-12">
          {/* Main content */}
          <div className="relative z-10">
            {/* Welcome message */}
            <div className="mb-8">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
                Welcome back, {userName?.split(' ')[0] || 'Chef'}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                Ready to create amazing culinary experiences?
              </p>
            </div>

            {/* Key metrics grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Earnings */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    {totalEarnings > 0 && (
                      <div className="flex items-center text-green-600 text-sm font-medium">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        <span>Active</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    ${totalEarnings.toLocaleString()}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Total Earnings
                  </p>
                </div>
              </div>

              {/* Active Bookings */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    {activeBookings > 0 && (
                      <Badge className="bg-blue-100 text-blue-600 border-blue-200">
                        {activeBookings} active
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {activeBookings}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Active Bookings
                  </p>
                </div>
              </div>

              {/* Available Requests */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    {availableRequests > 0 && (
                      <Badge className="bg-purple-100 text-purple-600 border-purple-200">
                        New
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {availableRequests}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Available Requests
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard/chef/requests">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 text-white px-8 py-3">
                  <FileText className="mr-2 h-5 w-5" />
                  Browse Requests
                  {availableRequests > 0 && (
                    <Badge className="ml-2 bg-white/20 text-white border-white/30">
                      {availableRequests}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link href="/dashboard/chef/profile">
                <Button variant="outline" size="lg" className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 px-8 py-3 rounded-xl">
                  <ChefHat className="mr-2 h-5 w-5" />
                  {completionPercentage < 100 ? 'Complete Profile' : 'Update Profile'}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
