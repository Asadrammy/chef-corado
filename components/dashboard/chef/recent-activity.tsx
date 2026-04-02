"use client"

import { useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight, FileText, ChefHat } from "lucide-react"
import Link from "next/link"

interface Booking {
  id: string
  title?: string
  status: string
  totalPrice?: number
  createdAt: string
  clientName?: string
  eventDate?: string
}

interface RecentActivityProps {
  bookings: Booking[]
  activeBookings: number
  completedBookings: number
}

export function RecentActivity({ bookings, activeBookings, completedBookings }: RecentActivityProps) {
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null)

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PENDING':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-600 border-green-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-600 border-red-200'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-600 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
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

  if (activeBookings === 0 && completedBookings === 0) {
    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
              <Calendar className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              No bookings yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
              Start by sending proposals to clients and showcase your culinary experiences
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard/chef/requests">
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                  <FileText className="mr-2 h-4 w-4" />
                  Browse Requests
                </Button>
              </Link>
              <Link href="/dashboard/chef/experiences">
                <Button variant="outline" className="border-gray-200 dark:border-gray-700">
                  <ChefHat className="mr-2 h-4 w-4" />
                  Create Experience
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeBookings > 0 && (
              <Badge className="bg-green-100 text-green-600 border-green-200">
                {activeBookings} active
              </Badge>
            )}
            {completedBookings > 0 && (
              <Badge className="bg-blue-100 text-blue-600 border-blue-200">
                {completedBookings} completed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookings.slice(0, 3).map((booking) => (
            <div
              key={booking.id}
              className="group relative"
              onMouseEnter={() => setHoveredBooking(booking.id)}
              onMouseLeave={() => setHoveredBooking(null)}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800/50 dark:to-blue-900/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Booking content */}
              <div className="relative bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      {getStatusIcon(booking.status)}
                    </div>
                    
                    {/* Booking details */}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {booking.title || 'Booking'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        {booking.clientName && (
                          <span>{booking.clientName}</span>
                        )}
                        {booking.eventDate && (
                          <span>• {new Date(booking.eventDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Price and status */}
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      ${booking.totalPrice || 0}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(booking.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Hover action */}
                {hoveredBooking === booking.id && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Link href={`/dashboard/chef/bookings/${booking.id}`}>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                        View Details
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {bookings.length > 3 && (
          <Link href="/dashboard/chef/bookings">
            <Button variant="ghost" className="w-full py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mt-4">
              View all bookings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
