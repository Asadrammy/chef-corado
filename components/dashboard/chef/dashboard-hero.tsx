"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

interface DashboardHeroProps {
  userName: string
  completionPercentage: number
  availableRequests: number
}

export function DashboardHero({ userName, completionPercentage, availableRequests }: DashboardHeroProps) {
  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardContent className="p-8">
        <div className="space-y-6">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            Chef Dashboard
          </Badge>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {userName?.split(' ')[0] || 'Chef'}
            </h1>
            <p className="text-gray-600">
              Let's get your next booking today
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg">
                Browse Requests
                {availableRequests > 0 && (
                  <span className="ml-2 bg-blue-700 text-white text-xs px-2 py-1 rounded-full">
                    {availableRequests}
                  </span>
                )}
              </Button>
            </Link>
            
            <Link href="/dashboard/chef/profile">
              <Button variant="outline" className="border-gray-200 hover:bg-gray-50 px-8 py-3 rounded-lg">
                {completionPercentage < 100 ? 'Complete Profile' : 'Update Profile'}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
