"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowRight } from "lucide-react"
import Link from "next/link"

interface ModernOpportunitiesProps {
  requests: Array<{
    id: string
    title: string
    budget: number
    clientName?: string
    location?: string
    createdAt: string
  }>
  availableRequestsCount: number
}

export function ModernOpportunities({ requests, availableRequestsCount }: ModernOpportunitiesProps) {
  if (availableRequestsCount === 0) {
    return (
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12">
          <div className="text-center max-w-md mx-auto space-y-6">
            {/* Large Icon */}
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Users className="h-10 w-10 text-gray-400" />
            </div>
            
            {/* Content */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-900">
                No requests in your area
              </h3>
              <p className="text-gray-600 text-lg">
                Check back later for new opportunities or expand your service area
              </p>
            </div>
            
            {/* CTA */}
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                Browse Requests
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Available Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.slice(0, 3).map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2 text-lg">
                    {request.title}
                  </h4>
                  <div className="text-gray-600 space-y-1">
                    {request.clientName && (
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Client:</span>
                        {request.clientName}
                      </p>
                    )}
                    {request.location && (
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Location:</span>
                        {request.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xl text-gray-900">
                    ${request.budget.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Link href={`/dashboard/chef/requests/${request.id}`}>
                  <Button variant="outline" className="border-gray-200 hover:bg-gray-50 px-6 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02]">
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          
          {availableRequestsCount > 3 && (
            <Link href="/dashboard/chef/requests">
              <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-900 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02]">
                View all {availableRequestsCount} requests
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
