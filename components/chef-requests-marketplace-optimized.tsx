"use client"

import * as React from "react"
import { Search, MapPin, Calendar, DollarSign, Clock, Users, Star, Zap, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChefRequestRow } from "@/components/chef-request-table"
import Link from "next/link"
import { growthAnalytics } from "@/lib/analytics"

export type OptimizedChefRequestRow = ChefRequestRow & {
  title?: string
  createdAt?: string
}

export type OptimizedChefRequestsMarketplaceProps = {
  requests: OptimizedChefRequestRow[]
}

export function OptimizedChefRequestsMarketplace({ requests }: OptimizedChefRequestsMarketplaceProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState("newest") // Default to newest for speed
  const [selectedUrgency, setSelectedUrgency] = React.useState("all")

  // Filter and sort requests with speed optimization
  const filteredRequests = React.useMemo(() => {
    let filtered = requests

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((request) =>
        request.location.toLowerCase().includes(query) ||
        (request.details?.toLowerCase().includes(query)) ||
        (request.title?.toLowerCase().includes(query))
      )
    }

    // Urgency filter
    if (selectedUrgency !== "all") {
      const now = new Date()
      filtered = filtered.filter((request) => {
        const eventDate = new Date(request.eventDate)
        const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        
        if (selectedUrgency === "urgent") return daysUntil <= 3
        if (selectedUrgency === "week") return daysUntil <= 7
        return true
      })
    }

    // Sort - prioritize newest and high budget for speed
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "budget-high":
          return b.budget - a.budget
        case "urgent":
          const aDays = (new Date(a.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          const bDays = (new Date(b.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          return aDays - bDays
        case "newest":
        default:
          return new Date(b.createdAt || b.eventDate).getTime() - new Date(a.createdAt || a.eventDate).getTime()
      }
    })

    return sorted
  }, [requests, searchQuery, sortBy, selectedUrgency])

  const displayRequests = filteredRequests

  // Track page view for analytics
  React.useEffect(() => {
    growthAnalytics.track('dashboard_viewed', undefined, {
      userRole: 'CHEF',
      action: 'browse_requests',
      requestCount: requests.length,
      hasNewRequests: requests.length > 0
    })
  }, [requests.length])

  return (
    <div className="p-6 space-y-6">
      {/* SPEED-FOCUSED HEADER */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              New Requests - Respond Fast!
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {requests.length > 0 
                ? `${requests.length} requests available - First chefs to respond usually win`
                : "No requests yet - check back soon!"
              }
            </p>
          </div>
          
          {requests.length > 0 && (
            <div className="flex gap-2">
              <Badge className="bg-green-100 text-green-700 px-3 py-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                Active Now
              </Badge>
            </div>
          )}
        </div>

        {/* URGENT FILTERS */}
        {requests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedUrgency === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedUrgency("all")}
            >
              All ({requests.length})
            </Button>
            <Button
              variant={selectedUrgency === "urgent" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedUrgency("urgent")}
              className="bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Clock className="w-3 h-3 mr-1" />
              Urgent (≤3 days)
            </Button>
            <Button
              variant={selectedUrgency === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedUrgency("week")}
            >
              <Calendar className="w-3 h-3 mr-1" />
              This Week
            </Button>
          </div>
        )}
      </div>

      {/* QUICK STATS */}
      {requests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-900">{requests.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Avg Budget</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${requests.length > 0 ? Math.round(requests.reduce((sum, r) => sum + r.budget, 0) / requests.length) : 0}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">This Week</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {requests.filter(r => {
                      const days = (new Date(r.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      return days <= 7 && days >= 0
                    }).length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">High Value</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {requests.filter(r => r.budget >= 500).length}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SEARCH AND SORT */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Quick search by location or event type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 border rounded-lg h-11"
        >
          <option value="newest">Newest First</option>
          <option value="urgent">Most Urgent</option>
          <option value="budget-high">Highest Budget</option>
        </select>
      </div>

      {/* REQUEST CARDS */}
      {displayRequests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayRequests.map((request) => (
            <OptimizedRequestCard key={request.id} request={request} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery || selectedUrgency !== "all" ? "No matching requests" : "No requests yet"}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchQuery || selectedUrgency !== "all" 
              ? "Try adjusting your filters or search terms"
              : "We'll notify you when new requests appear in your area"
            }
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/chef/profile">
              <Button>Update Profile</Button>
            </Link>
            <Button variant="outline">Expand Service Area</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function OptimizedRequestCard({ request }: { request: OptimizedChefRequestRow }) {
  const [isHovered, setIsHovered] = React.useState(false)
  
  // Calculate urgency
  const getUrgencyLevel = () => {
    const daysUntil = (new Date(request.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntil <= 3) return { level: 'urgent', color: 'red', text: 'Urgent!' }
    if (daysUntil <= 7) return { level: 'soon', color: 'orange', text: 'This Week' }
    return { level: 'normal', color: 'blue', text: 'Upcoming' }
  }

  const urgency = getUrgencyLevel()
  const isHighBudget = request.budget >= 500
  const isNew = request.createdAt ? new Date(request.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 : false

  const handleQuickResponse = () => {
    // Track quick response click
    growthAnalytics.track('proposal_sent', undefined, {
      userRole: 'CHEF',
      requestId: request.id,
      budget: request.budget,
      urgency: urgency.level,
      isQuickResponse: true
    })
    
    // Navigate to proposal form with pre-filled data
    window.location.href = `/dashboard/chef/requests/${request.id}/propose`
  }

  return (
    <Card 
      className={`bg-white rounded-xl border-2 p-4 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer ${
        urgency.level === 'urgent' ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with urgency and budget */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {urgency.level === 'urgent' && (
            <Badge className="bg-red-100 text-red-700 px-2 py-1 text-xs font-medium">
              <Clock className="w-3 h-3 mr-1" />
              {urgency.text}
            </Badge>
          )}
          {isNew && (
            <Badge className="bg-green-100 text-green-700 px-2 py-1 text-xs font-medium">
              <Star className="w-3 h-3 mr-1" />
              New
            </Badge>
          )}
          {isHighBudget && (
            <Badge className="bg-purple-100 text-purple-700 px-2 py-1 text-xs font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              High Value
            </Badge>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">${request.budget}</div>
          {isHighBudget && (
            <div className="text-xs text-green-600">Great budget!</div>
          )}
        </div>
      </div>
      
      {/* Event details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="font-medium">{request.location}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(request.eventDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span className={urgency.level === 'urgent' ? 'text-red-600 font-medium' : ''}>
              {Math.ceil((new Date(request.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {request.title || 'Event Request'}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {request.details || 'No additional details provided'}
      </p>

      {/* Quick Action Button */}
      <Button 
        onClick={handleQuickResponse}
        className={`w-full py-3 font-semibold transition-all ${
          urgency.level === 'urgent' 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <Zap className="w-4 h-4 mr-2" />
        {urgency.level === 'urgent' ? 'Respond Now - Urgent!' : 'Send Proposal'}
      </Button>

      {/* Trust indicators */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>Posted {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Recently'}</span>
        <span>Fast response preferred</span>
      </div>
    </Card>
  )
}
