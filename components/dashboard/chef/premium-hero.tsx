"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ChefHat, ArrowRight } from "lucide-react"
import Link from "next/link"

interface PremiumHeroProps {
  userName: string
  completionPercentage: number
  availableRequests: number
}

export function PremiumHero({ userName, completionPercentage, availableRequests }: PremiumHeroProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-80 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-3xl animate-pulse" />
    )
  }

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950 dark:via-gray-900 dark:to-purple-950">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTYzIDM0di00aC0ydjRoLTRoMnY0aDJ2LTRoNHYtMmgtNHptMC0zMFYwaC0ydjRoLTRoMnY0aDJWNmg0VjRoLTR6TTYgMzR2LTRINHY0SDBoMnY0aDJ2LTRoNHYtMkg2ek02IDRWMGg0djRIMHYyaDR2NGgyVjZoNFY0SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
      </div>
      
      {/* Glassmorphism card */}
      <Card className="relative border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl">
        <CardContent className="p-8 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left side - Welcome message */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Welcome back, {userName?.split(' ')[0] || 'Chef'} 👋
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-lg">
                  Ready to create amazing culinary experiences and grow your business?
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard/chef/requests">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 text-white px-8 py-3 rounded-xl"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Browse Requests
                    {availableRequests > 0 && (
                      <Badge className="ml-2 bg-white/20 text-white border-white/30">
                        {availableRequests} new
                      </Badge>
                    )}
                  </Button>
                </Link>
                
                <Link href="/dashboard/chef/profile">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 px-8 py-3 rounded-xl transition-all duration-300"
                  >
                    <ChefHat className="mr-2 h-5 w-5" />
                    {completionPercentage < 100 ? 'Complete Profile' : 'Update Profile'}
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Right side - Visual element */}
            <div className="relative">
              <div className="relative z-10">
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                      <ChefHat className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Your Culinary Journey
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {completionPercentage < 100 
                          ? `Complete your profile (${Math.round(completionPercentage)}%) to unlock more opportunities`
                          : "Your profile is complete and ready to attract clients!"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20 blur-xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 blur-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
