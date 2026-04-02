"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowRight } from "lucide-react"
import Link from "next/link"

interface PremiumOpportunitiesProps {
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

export function PremiumOpportunities({ requests, availableRequestsCount }: PremiumOpportunitiesProps) {
  if (availableRequestsCount === 0) {
    return (
      <Card className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            Available Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12">
          <div className="text-center max-w-md mx-auto space-y-8">
            {/* Large Icon */}
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            
            {/* Content */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">
                No requests in your area
              </h3>
              <p className="text-lg text-gray-600">
                Check back later for new opportunities or expand your service area
              </p>
            </div>
            
            {/* CTA */}
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-lg font-medium">
                Browse Requests
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-6">
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          Available Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="space-y-6">
          {requests.slice(0, 3).map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-xl p-6 hover:bg-gray-50 hover:shadow-sm transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-3 text-xl">
                    {request.title}
                  </h4>
                  <div className="text-gray-600 space-y-2">
                    {request.clientName && (
                      <p className="flex items-center gap-2 text-lg">
                        <span className="font-medium">Client:</span>
                        {request.clientName}
                      </p>
                    )}
                    {request.location && (
                      <p className="flex items-center gap-2 text-lg">
                        <span className="font-medium">Location:</span>
                        {request.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-2xl text-gray-900">
                    ${request.budget.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Link href={`/dashboard/chef/requests/${request.id}`}>
                  <Button variant="outline" className="border-gray-200 hover:bg-gray-50 px-8 py-3 rounded-xl transition-all duration-300 hover:-translate-y-1 text-lg font-medium">
                    View Details
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          
          {availableRequestsCount > 3 && (
            <Link href="/dashboard/chef/requests">
              <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-900 py-4 rounded-xl transition-all duration-300 hover:-translate-y-1 text-lg font-medium">
                View all {availableRequestsCount} requests
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
