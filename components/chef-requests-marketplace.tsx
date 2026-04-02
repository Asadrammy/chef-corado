"use client"

import * as React from "react"
import { Search, Filter, ArrowUpDown, MapPin, Calendar, DollarSign, Clock, Users, Star, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChefRequestRow } from "@/components/chef-request-table"
import Link from "next/link"
import { ProposalModal } from "@/components/proposal-modal"

export type ChefRequestsMarketplaceProps = {
  requests: ChefRequestRow[]
}

export function ChefRequestsMarketplace({ requests }: ChefRequestsMarketplaceProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState("newest")
  const [showFilters, setShowFilters] = React.useState(false)

  // Filter and sort requests
  const filteredRequests = React.useMemo(() => {
    let filtered = requests

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((request) =>
        request.location.toLowerCase().includes(query) ||
        request.details?.toLowerCase().includes(query)
      )
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "budget-high":
          return b.budget - a.budget
        case "budget-low":
          return a.budget - b.budget
        case "newest":
        default:
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
      }
    })

    return sorted
  }, [requests, searchQuery, sortBy])

  const displayRequests = filteredRequests

  return (
    <div className="p-6 space-y-8">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Incoming Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and respond to client requests in your area</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="budget-high">Budget: High to Low</SelectItem>
              <SelectItem value="budget-low">Budget: Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* STATS BAR - derived from real requests */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Available Requests</p>
              <p className="text-2xl font-semibold text-gray-900">{requests.length}</p>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Upcoming Requests</p>
              <p className="text-2xl font-semibold text-gray-900">
                {requests.filter((request) => new Date(request.eventDate) >= new Date()).length}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Highest Budget</p>
              <p className="text-2xl font-semibold text-gray-900">
                {requests.length
                  ? `$${Math.max(...requests.map((request) => request.budget)).toLocaleString()}`
                  : "$0"}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* SEARCH + SORT BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* REQUEST CARDS GRID */}
      {displayRequests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="text-center py-16">
          <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            We'll notify you when new requests appear in your area
          </p>
          <div className="flex gap-4 justify-center">
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

function RequestCard({ request }: { request: ChefRequestRow }) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [priorityBadge] = React.useState(() => {
    // Use a deterministic approach based on request ID to avoid hydration mismatch
    const hash = request.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const normalized = hash % 100
    if (normalized > 70) return { text: "🔥 Urgent", variant: "urgent" as const }
    if (normalized > 40) return { text: "New", variant: "new" as const }
    return null
  })

  // Mock event type based on details
  const getEventType = (details?: string | null) => {
    if (!details) return "General"
    if (details.toLowerCase().includes("corporate")) return "Corporate"
    if (details.toLowerCase().includes("wedding")) return "Wedding"
    if (details.toLowerCase().includes("birthday")) return "Birthday"
    if (details.toLowerCase().includes("anniversary")) return "Anniversary"
    return "Event"
  }

  const eventType = getEventType(request.details)

  return (
    <Card 
      className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer space-y-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with client intent icon and budget */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{eventType} Event</h3>
            {priorityBadge && (
              <Badge 
                className={`text-xs px-2 py-1 rounded-full mt-1 ${
                  priorityBadge.variant === 'urgent' 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {priorityBadge.text}
              </Badge>
            )}
          </div>
        </div>
        <Badge className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
          ${request.budget}
        </Badge>
      </div>
      
      {/* Event details */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{request.location}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(request.eventDate).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Evening</span>
          </div>
        </div>
      </div>

      {/* Event type badge */}
      <Badge variant="outline" className="w-fit">
        {eventType}
      </Badge>

      {/* Description */}
      <p className="line-clamp-2 text-sm text-gray-600">
        {request.details || "No additional details provided"}
      </p>

      {/* CTA Button */}
      <ProposalModal request={request}>
        <Button 
          className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          Send Proposal
        </Button>
      </ProposalModal>
    </Card>
  )
}
