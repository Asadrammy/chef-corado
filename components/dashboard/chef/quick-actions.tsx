"use client"

import { useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat, FileText, Calendar, DollarSign, Settings, Plus, Search, Bell } from "lucide-react"
import Link from "next/link"

interface QuickActionsProps {
  availableRequests: number
  activeBookings: number
  completionPercentage: number
}

export function QuickActions({ availableRequests, activeBookings, completionPercentage }: QuickActionsProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null)

  const actions = [
    {
      id: 'requests',
      title: 'Browse Requests',
      description: 'Find new opportunities',
      icon: FileText,
      href: '/dashboard/chef/requests',
      badge: availableRequests > 0 ? availableRequests : null,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'from-blue-600 to-blue-700'
    },
    {
      id: 'experiences',
      title: 'Manage Experiences',
      description: 'Update your offerings',
      icon: ChefHat,
      href: '/dashboard/chef/experiences',
      badge: null,
      color: 'from-purple-500 to-purple-600',
      hoverColor: 'from-purple-600 to-purple-700'
    },
    {
      id: 'availability',
      title: 'Set Availability',
      description: 'Update your schedule',
      icon: Calendar,
      href: '/dashboard/chef/availability',
      badge: null,
      color: 'from-green-500 to-green-600',
      hoverColor: 'from-green-600 to-green-700'
    },
    {
      id: 'bookings',
      title: 'View Bookings',
      description: 'Manage your bookings',
      icon: Calendar,
      href: '/dashboard/chef/bookings',
      badge: activeBookings > 0 ? activeBookings : null,
      color: 'from-orange-500 to-orange-600',
      hoverColor: 'from-orange-600 to-orange-700'
    },
    {
      id: 'payouts',
      title: 'View Earnings',
      description: 'Track your income',
      icon: DollarSign,
      href: '/dashboard/chef/payouts',
      badge: null,
      color: 'from-emerald-500 to-emerald-600',
      hoverColor: 'from-emerald-600 to-emerald-700'
    },
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Update your profile',
      icon: Settings,
      href: '/dashboard/chef/profile',
      badge: completionPercentage < 100 ? `${Math.round(completionPercentage)}%` : null,
      color: 'from-gray-500 to-gray-600',
      hoverColor: 'from-gray-600 to-gray-700'
    }
  ]

  return (
    <div className="sticky top-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quick Actions
        </h3>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Action Cards */}
      <div className="space-y-3">
        {actions.map((action) => (
          <Link key={action.id} href={action.href}>
            <div
              className="group relative"
              onMouseEnter={() => setHoveredAction(action.id)}
              onMouseLeave={() => setHoveredAction(null)}
            >
              {/* Hover gradient overlay */}
              <div 
                className={`absolute inset-0 bg-gradient-to-r ${action.color} rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
              />
              
              {/* Card content */}
              <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      
                      {/* Text content */}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {action.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Badge or Arrow */}
                    <div className="flex items-center">
                      {action.badge ? (
                        <Badge 
                          className={`bg-gradient-to-r ${action.color} text-white border-0 text-xs`}
                        >
                          {action.badge}
                        </Badge>
                      ) : (
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                          <Plus className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Hover effect line */}
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${action.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
                </CardContent>
              </Card>
            </div>
          </Link>
        ))}
      </div>

      {/* Floating CTA Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white mx-auto mb-4">
            <Bell className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            Stay Updated
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Get notified about new requests and booking updates
          </p>
          <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
            Enable Notifications
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
