"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

interface CleanHeroProps {
  userName: string
  completionPercentage: number
  availableRequests: number
}

export function CleanHero({ userName, completionPercentage, availableRequests }: CleanHeroProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userName?.split(' ')[0] || 'Chef'}
        </h1>
        <p className="text-gray-600">
          Ready to create amazing culinary experiences?
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/dashboard/chef/requests">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
            Browse Requests
            {availableRequests > 0 && (
              <span className="ml-2 bg-blue-700 text-white text-xs px-2 py-1 rounded">
                {availableRequests}
              </span>
            )}
          </Button>
        </Link>
        
        <Link href="/dashboard/chef/profile">
          <Button variant="outline" className="border-gray-200 hover:bg-gray-50 px-6 py-2">
            {completionPercentage < 100 ? 'Complete Profile' : 'Update Profile'}
          </Button>
        </Link>
      </div>
    </div>
  )
}
