"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

interface ModernHeroProps {
  userName: string
  completionPercentage: number
  availableRequests: number
}

export function ModernHero({ userName, completionPercentage, availableRequests }: ModernHeroProps) {
  return (
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Badge */}
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 text-sm">
            Chef Dashboard
          </Badge>
          
          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              Welcome back, {userName?.split(' ')[0] || 'Chef'}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              Ready to create amazing culinary experiences?
            </p>
          </div>
          
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                Browse Requests
                {availableRequests > 0 && (
                  <span className="ml-2 bg-blue-700 text-white text-xs px-2 py-1 rounded-full">
                    {availableRequests}
                  </span>
                )}
              </Button>
            </Link>
            
            <Link href="/dashboard/chef/profile">
              <Button variant="outline" className="border-gray-200 hover:bg-gray-50 px-8 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02]">
                {completionPercentage < 100 ? 'Complete Profile' : 'Update Profile'}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
