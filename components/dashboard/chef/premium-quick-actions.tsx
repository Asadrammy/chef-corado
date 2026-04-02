"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChefHat, FileText, Calendar, DollarSign, Settings, Bell, Search } from "lucide-react"
import { ActionCard } from "@/components/ui/action-card"
import Link from "next/link"

interface PremiumQuickActionsProps {
  availableRequests: number
  activeBookings: number
  completionPercentage: number
}

export function PremiumQuickActions({ availableRequests, activeBookings, completionPercentage }: PremiumQuickActionsProps) {
  const [isHovered, setIsHovered] = useState(false)

  const actions = [
    {
      title: 'Browse Requests',
      description: 'Find new opportunities',
      icon: <FileText className="h-5 w-5" />,
      href: '/dashboard/chef/requests',
      badge: availableRequests > 0 ? availableRequests.toString() : null,
      color: 'blue' as const,
      highlight: availableRequests > 0
    },
    {
      title: 'Manage Experiences',
      description: 'Update your offerings',
      icon: <ChefHat className="h-5 w-5" />,
      href: '/dashboard/chef/experiences',
      badge: null,
      color: 'purple' as const,
      highlight: false
    },
    {
      title: 'Set Availability',
      description: 'Update your schedule',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/chef/availability',
      badge: null,
      color: 'green' as const,
      highlight: false
    },
    {
      title: 'View Bookings',
      description: 'Manage your bookings',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/chef/bookings',
      badge: activeBookings > 0 ? activeBookings.toString() : null,
      color: 'orange' as const,
      highlight: activeBookings > 0
    },
    {
      title: 'View Earnings',
      description: 'Track your income',
      icon: <DollarSign className="h-5 w-5" />,
      href: '/dashboard/chef/payouts',
      badge: null,
      color: 'green' as const,
      highlight: false
    },
    {
      title: 'Profile Settings',
      description: 'Update your profile',
      icon: <Settings className="h-5 w-5" />,
      href: '/dashboard/chef/profile',
      badge: completionPercentage < 100 ? `${Math.round(completionPercentage)}%` : undefined,
      color: 'gray' as const,
      highlight: completionPercentage < 100
    }
  ]

  return (
    <div className="sticky top-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quick Actions
        </h3>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Floating Action Cards */}
      <div className="space-y-3">
        {actions.map((action) => (
          <ActionCard
            key={action.title}
            title={action.title}
            description={action.description}
            icon={action.icon}
            href={action.href}
            badge={action.badge}
            color={action.color}
          />
        ))}
      </div>

      {/* Floating Notification CTA */}
      <Card 
        className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-6 text-center relative">
          {/* Animated background */}
          <div className={`absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-800/30 dark:to-purple-800/30 transition-opacity duration-300 ${isHovered ? 'opacity-50' : 'opacity-0'}`} />
          
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
              <Bell className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Stay Updated
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Get notified about new requests and booking updates
            </p>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              Enable Notifications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion Progress */}
      {completionPercentage < 100 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900 dark:text-white">Profile Completion</span>
                <span className="text-gray-600 dark:text-gray-300">{Math.round(completionPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <Link href="/dashboard/chef/profile">
                <Button size="sm" variant="outline" className="w-full mt-2">
                  Complete Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
