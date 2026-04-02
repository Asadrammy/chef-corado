"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowRight, Sparkles } from "lucide-react"
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

export function PremiumOpportunitiesV3({ requests, availableRequestsCount }: PremiumOpportunitiesProps) {
  if (availableRequestsCount === 0) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-0 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-20">
          <div className="text-center max-w-2xl mx-auto space-y-10">
            {/* Large Icon */}
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Sparkles className="h-16 w-16 text-white" />
              </div>
              {/* Decorative rings */}
              <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-20 blur-xl animate-pulse" />
            </div>
            
            {/* Content */}
            <div className="space-y-6">
              <h3 className="text-4xl font-bold text-gray-900">
                You're all set to start earning! 🎉
              </h3>
              <p className="text-xl text-gray-600 leading-relaxed">
                New opportunities will appear here as clients discover your profile. 
                Make sure your profile is complete to attract more bookings.
              </p>
            </div>
            
            {/* Primary CTA */}
            <Link href="/dashboard/chef/requests">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] text-xl font-medium">
                Browse All Requests
                <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
            </Link>
            
            {/* Secondary Message */}
            <p className="text-gray-500 text-lg">
              💡 Pro tip: Complete your profile to get 3x more requests
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-0 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-8">
        <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              Available Opportunities
              {availableRequestsCount > 0 && (
                <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                  {availableRequestsCount} active
                </span>
              )}
            </div>
            <p className="text-gray-600 text-lg font-normal mt-2">
              Start earning with these requests
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="space-y-6">
          {requests.slice(0, 3).map((request) => (
            <div key={request.id} className="border border-gray-200 rounded-2xl p-8 hover:bg-gray-50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-4 text-2xl">
                    {request.title}
                  </h4>
                  <div className="text-gray-600 space-y-3 text-lg">
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
                  <p className="font-bold text-3xl text-gray-900 mb-2">
                    ${request.budget.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Link href={`/dashboard/chef/requests/${request.id}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] text-lg font-medium">
                    Send Proposal
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          
          {availableRequestsCount > 3 && (
            <Link href="/dashboard/chef/requests">
              <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-900 py-4 rounded-xl transition-all duration-300 hover:scale-[1.02] text-lg font-medium">
                View all {availableRequestsCount} opportunities
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
