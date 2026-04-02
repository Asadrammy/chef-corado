"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import Link from "next/link"

interface CleanOpportunitiesProps {
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

export function CleanOpportunities({ requests, availableRequestsCount }: CleanOpportunitiesProps) {
  if (availableRequestsCount === 0) {
    return (
      <Card className="border border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Available Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                No requests in your area
              </h3>
              <p className="text-gray-600">
                Check back later for new opportunities
              </p>
            </div>
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Browse Requests
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-gray-200 rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Available Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.slice(0, 3).map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {request.title}
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {request.clientName && (
                      <p>Client: {request.clientName}</p>
                    )}
                    {request.location && (
                      <p>Location: {request.location}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${request.budget.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Link href={`/dashboard/chef/requests/${request.id}`}>
                  <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          
          {availableRequestsCount > 3 && (
            <Link href="/dashboard/chef/requests">
              <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-900">
                View all {availableRequestsCount} requests →
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
