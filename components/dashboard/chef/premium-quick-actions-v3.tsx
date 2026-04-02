"use client"

import { FileText, ChefHat, Calendar, DollarSign, ArrowRight } from "lucide-react"
import Link from "next/link"

interface PremiumQuickActionsProps {
  availableRequests: number
  activeBookings: number
}

export function PremiumQuickActionsV3({ availableRequests, activeBookings }: PremiumQuickActionsProps) {
  const actions = [
    {
      title: 'Browse Requests',
      icon: <FileText className="h-5 w-5" />,
      href: '/dashboard/chef/requests',
      badge: availableRequests > 0 ? availableRequests : null,
      color: 'blue' as const
    },
    {
      title: 'Manage Experiences',
      icon: <ChefHat className="h-5 w-5" />,
      href: '/dashboard/chef/experiences',
      badge: null,
      color: 'purple' as const
    },
    {
      title: 'Set Availability',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/chef/availability',
      badge: null,
      color: 'green' as const
    },
    {
      title: 'View Bookings',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/chef/bookings',
      badge: activeBookings > 0 ? activeBookings : null,
      color: 'orange' as const
    },
    {
      title: 'View Earnings',
      icon: <DollarSign className="h-5 w-5" />,
      href: '/dashboard/chef/payouts',
      badge: null,
      color: 'green' as const
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
      case 'purple': return 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
      case 'green': return 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
      case 'orange': return 'bg-gradient-to-br from-orange-500 to-red-500 text-white'
      default: return 'bg-gradient-to-br from-gray-500 to-gray-600 text-white'
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
        <p className="text-sm text-gray-500">Access your most used features</p>
      </div>
      
      <div className="space-y-3">
        {actions.map((action) => (
          <Link key={action.title} href={action.href}>
            <div className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all duration-300 hover:translate-x-2">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-xl ${getColorClasses(action.color)} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-lg">{action.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {action.badge && (
                  <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full font-medium">
                    {action.badge}
                  </span>
                )}
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
