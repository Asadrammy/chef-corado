"use client"

import { FileText, ChefHat, Calendar, DollarSign } from "lucide-react"
import Link from "next/link"

interface CleanQuickActionsProps {
  availableRequests: number
  activeBookings: number
}

export function CleanQuickActions({ availableRequests, activeBookings }: CleanQuickActionsProps) {
  const actions = [
    {
      title: 'Browse Requests',
      icon: <FileText className="h-4 w-4" />,
      href: '/dashboard/chef/requests',
      badge: availableRequests > 0 ? availableRequests : null
    },
    {
      title: 'Manage Experiences',
      icon: <ChefHat className="h-4 w-4" />,
      href: '/dashboard/chef/experiences',
      badge: null
    },
    {
      title: 'Set Availability',
      icon: <Calendar className="h-4 w-4" />,
      href: '/dashboard/chef/availability',
      badge: null
    },
    {
      title: 'View Bookings',
      icon: <Calendar className="h-4 w-4" />,
      href: '/dashboard/chef/bookings',
      badge: activeBookings > 0 ? activeBookings : null
    },
    {
      title: 'View Earnings',
      icon: <DollarSign className="h-4 w-4" />,
      href: '/dashboard/chef/payouts',
      badge: null
    }
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Quick Actions
      </h3>
      
      <div className="space-y-1">
        {actions.map((action) => (
          <Link key={action.title} href={action.href}>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="text-gray-600">
                  {action.icon}
                </div>
                <span className="text-gray-900">{action.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {action.badge && (
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    {action.badge}
                  </span>
                )}
                <span className="text-gray-400">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
