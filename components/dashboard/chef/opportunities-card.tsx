"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowRight } from "lucide-react"
import Link from "next/link"

interface OpportunitiesCardProps {
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

export function OpportunitiesCard({ requests, availableRequestsCount }: OpportunitiesCardProps) {
  if (availableRequestsCount === 0) {
    return (
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="p-16 text-center">
          <div className="space-y-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="h-10 w-10 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-gray-900">
                You're all set to start earning
              </h3>
              <p className="text-gray-600">
                New opportunities will appear here as clients discover your profile
              </p>
            </div>
            
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg">
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
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Available Opportunities
          {availableRequestsCount > 0 && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm">
              {availableRequestsCount} active
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {requests.slice(0, 3).map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">
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
                  <p className="font-bold text-lg text-gray-900">
                    ${request.budget.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Link href={`/dashboard/chef/requests/${request.id}`}>
                  <Button variant="outline" className="border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg">
                    Send Proposal
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          
          {availableRequestsCount > 3 && (
            <Link href="/dashboard/chef/requests">
              <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-900 py-2">
                View all {availableRequestsCount} opportunities
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
