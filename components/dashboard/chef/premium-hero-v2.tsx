"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

interface PremiumHeroProps {
  userName: string
  completionPercentage: number
  availableRequests: number
}

export function PremiumHero({ userName, completionPercentage, availableRequests }: PremiumHeroProps) {
  return (
    <Card className="bg-gradient-to-br from-gray-50 to-white border-0 shadow-md hover:shadow-lg transition-all duration-300">
      <CardContent className="p-10">
        <div className="space-y-6">
          {/* Badge */}
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-4 py-2 text-sm font-medium">
            Chef Dashboard
          </Badge>
          
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 leading-tight max-w-3xl">
              Welcome back, {userName?.split(' ')[0] || 'Chef'}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              Ready to create amazing culinary experiences?
            </p>
          </div>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-lg font-medium">
                Browse Requests
                {availableRequests > 0 && (
                  <span className="ml-3 bg-blue-700 text-white text-sm px-3 py-1 rounded-full font-medium">
                    {availableRequests}
                  </span>
                )}
              </Button>
            </Link>
            
            <Link href="/dashboard/chef/profile">
              <Button variant="outline" className="border-gray-200 hover:bg-gray-50 px-10 py-4 rounded-xl transition-all duration-300 hover:-translate-y-1 text-lg font-medium">
                {completionPercentage < 100 ? 'Complete Profile' : 'Update Profile'}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
