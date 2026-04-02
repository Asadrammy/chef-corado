"use client"

import * as React from "react"
import { Search, Filter, ArrowUpDown, Calendar, MapPin, DollarSign, Users, CheckCircle, Clock, XCircle, MessageSquare, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"

type ChefBookingPayload = {
  id: string
  totalPrice: string
  status: BookingStatus
  eventDate: string
  location: string
  createdAt: string
  client: {
    name: string | null
  }
  proposal?: {
    request?: {
      eventDate: string
      details: string | null
      location: string
    }
  }
}

export function ChefBookingsDashboard() {
  const [bookings, setBookings] = React.useState<ChefBookingPayload[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState("newest")

  React.useEffect(() => {
    let isMounted = true

    const loadBookings = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/bookings", {
          cache: "no-store",
          credentials: "include",
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || "Unable to load bookings")
        }

        const payload: { bookings: ChefBookingPayload[] } = await response.json()
        if (isMounted) {
          setBookings(payload.bookings ?? [])
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load bookings")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadBookings()

    return () => {
      isMounted = false
    }
  }, [])

  // Filter and sort bookings
  const filteredBookings = React.useMemo(() => {
    let filtered = bookings

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(booking => 
        booking.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.proposal?.request?.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.proposal?.request?.details?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === statusFilter.toUpperCase())
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-high":
          return Number(b.totalPrice) - Number(a.totalPrice)
        case "price-low":
          return Number(a.totalPrice) - Number(b.totalPrice)
        case "newest":
        default:
          // Use eventDate from booking or from proposal.request, fallback to createdAt
          const dateA = a.eventDate || a.proposal?.request?.eventDate || a.createdAt
          const dateB = b.eventDate || b.proposal?.request?.eventDate || b.createdAt
          return new Date(dateB).getTime() - new Date(dateA).getTime()
      }
    })

    return sorted
  }, [bookings, searchQuery, statusFilter, sortBy])

  const getStatusBadge = (status: BookingStatus) => {
    const statusConfig = {
      PENDING: { label: "Pending", className: "bg-blue-100 text-blue-700 border-blue-200" },
      CONFIRMED: { label: "Upcoming", className: "bg-blue-100 text-blue-700 border-blue-200" },
      COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 border-green-200" },
      CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200" }
    }
    
    const config = statusConfig[status]
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  }

  const formatPrice = (value: string) => {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      return value
    }
    return `$${parsed.toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading bookings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-gray-500 text-sm">Please try reloading the page or checking your connection.</p>
        </div>
      </div>
    )
  }

  const totalBookings = bookings.length
  const upcomingEvents = bookings.filter((booking) => booking.status === "PENDING" || booking.status === "CONFIRMED").length
  const completedEvents = bookings.filter((booking) => booking.status === "COMPLETED").length
  const totalEarnings = bookings
    .filter((booking) => booking.status === "COMPLETED")
    .reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0)

  return (
    <div className="p-6 space-y-8">
      {/* PAGE HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your confirmed events and track status</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="confirmed">Upcoming</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">{totalBookings}</p>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Upcoming Events</p>
              <p className="text-2xl font-semibold text-gray-900">{upcomingEvents}</p>
            </div>
            <div className="h-12 w-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Completed Events</p>
              <p className="text-2xl font-semibold text-gray-900">{completedEvents}</p>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Earnings</p>
              <p className="text-2xl font-semibold text-gray-900">${totalEarnings.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* SEARCH + FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* BOOKINGS LIST */}
      {filteredBookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        /* EMPTY STATE */
        <div className="text-center py-16">
          <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Start by browsing incoming requests and sending proposals. Once a client accepts your proposal, your booking will appear here.
          </p>
          <div className="space-y-3 mb-6">
            <div className="text-sm text-gray-600">
              <strong>Next steps:</strong>
              <ol className="mt-2 space-y-1 text-left inline-block">
                <li>1. Browse available requests in your area</li>
                <li>2. Send a proposal with your pricing</li>
                <li>3. Wait for client acceptance</li>
              </ol>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard/chef/requests">
              <Button>Browse Requests</Button>
            </Link>
            <Link href="/dashboard/chef/profile">
              <Button variant="outline">Update Profile</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking }: { booking: ChefBookingPayload }) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <Card 
      className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-0 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1">
              {booking.proposal?.request?.location || booking.location}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {booking.client?.name || "Client"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-green-600">${Number(booking.totalPrice).toFixed(2)}</p>
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(booking.proposal?.request?.eventDate || booking.eventDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{booking.proposal?.request?.location || booking.location}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {getStatusBadge(booking.status)}
        </div>

        {/* Description */}
        {booking.proposal?.request?.details && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {booking.proposal.request.details}
          </p>
        )}

        {/* CTA Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function getStatusBadge(status: BookingStatus) {
  const statusConfig = {
    PENDING: { label: "Pending", className: "bg-blue-100 text-blue-700 border-blue-200" },
    CONFIRMED: { label: "Upcoming", className: "bg-blue-100 text-blue-700 border-blue-200" },
    COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 border-green-200" },
    CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200" }
  }
  
  const config = statusConfig[status]
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}
