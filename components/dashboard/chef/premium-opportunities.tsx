"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, DollarSign, Calendar, Send, Clock, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/empty-state"

interface Request {
  id: string
  title: string
  description: string
  budget: number
  createdAt: string
  clientName?: string
  location?: string
  distance?: number
  urgency?: 'low' | 'medium' | 'high'
  eventDate?: string
}

interface PremiumOpportunitiesProps {
  requests: Request[]
  availableRequestsCount: number
}

export function PremiumOpportunities({ requests, availableRequestsCount }: PremiumOpportunitiesProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-600 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-600 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-600 border-green-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getUrgencyText = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'Urgent'
      case 'medium': return 'Soon'
      case 'low': return 'Flexible'
      default: return 'Normal'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (availableRequestsCount === 0) {
    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon="search"
            title="No requests in your area 😕"
            description="Expand your service area to reach more clients or check back later for new opportunities in your region."
            actionLabel="Expand Service Area"
            actionHref="/dashboard/chef/profile"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Opportunities
          </CardTitle>
          {availableRequestsCount > 0 && (
            <Badge className="bg-green-100 text-green-600 border-green-200">
              {availableRequestsCount} available
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.slice(0, 3).map((request) => (
            <div
              key={request.id}
              className="group relative"
              onMouseEnter={() => setHoveredCard(request.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Premium card with hover effects */}
              <div className="relative bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                {/* Header with client info and budget */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">
                      {request.title}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                      {request.clientName && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {request.clientName}
                        </span>
                      )}
                      {request.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {request.location}
                          {request.distance && (
                            <span className="text-xs text-gray-500">
                              ({request.distance} km)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {/* Budget highlight */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-4 py-2 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-green-600 text-lg">
                          ${request.budget.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Urgency badge */}
                    {request.urgency && (
                      <Badge className={`text-xs ${getUrgencyColor(request.urgency)}`}>
                        {getUrgencyText(request.urgency)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                  {request.description}
                </p>

                {/* Footer with date and actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    {request.eventDate 
                      ? new Date(request.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : formatDate(request.createdAt)
                    }
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/chef/requests/${request.id}`}>
                      <Button size="sm" variant="outline" className="rounded-lg">
                        View Details
                      </Button>
                    </Link>
                    
                    {/* Direct CTA button */}
                    <Link href={`/dashboard/chef/requests/${request.id}/propose`}>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <Send className="mr-1 h-3 w-3" />
                        Send Proposal
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {availableRequestsCount > 3 && (
            <Link href="/dashboard/chef/requests">
              <Button variant="ghost" className="w-full py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
