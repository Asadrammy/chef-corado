"use client"

import { FileText, ChefHat, Calendar, DollarSign, ArrowRight } from "lucide-react"
import Link from "next/link"

interface ModernQuickActionsProps {
  availableRequests: number
  activeBookings: number
}

export function ModernQuickActions({ availableRequests, activeBookings }: ModernQuickActionsProps) {
  const actions = [
    {
      title: 'Browse Requests',
      description: 'Find new opportunities',
      icon: <FileText className="h-5 w-5" />,
      href: '/dashboard/chef/requests',
      badge: availableRequests > 0 ? availableRequests : null,
      color: 'blue' as const
    },
    {
      title: 'Manage Experiences',
      description: 'Update your offerings',
      icon: <ChefHat className="h-5 w-5" />,
      href: '/dashboard/chef/experiences',
      badge: null,
      color: 'purple' as const
    },
    {
      title: 'Set Availability',
      description: 'Update your schedule',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/chef/availability',
      badge: null,
      color: 'green' as const
    },
    {
      title: 'View Bookings',
      description: 'Manage your bookings',
      icon: <Calendar className="h-5 w-5" />,
      href: '/dashboard/chef/bookings',
      badge: activeBookings > 0 ? activeBookings : null,
      color: 'orange' as const
    },
    {
      title: 'View Earnings',
      description: 'Track your income',
      icon: <DollarSign className="h-5 w-5" />,
      href: '/dashboard/chef/payouts',
      badge: null,
      color: 'green' as const
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50 text-blue-600 border-blue-200'
      case 'purple': return 'bg-purple-50 text-purple-600 border-purple-200'
      case 'green': return 'bg-green-50 text-green-600 border-green-200'
      case 'orange': return 'bg-orange-50 text-orange-600 border-orange-200'
      default: return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Quick Actions
      </h3>
      
      <div className="space-y-3">
        {actions.map((action) => (
          <Link key={action.title} href={action.href}>
            <div className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all duration-200 hover:scale-[1.02]">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 rounded-lg ${getColorClasses(action.color)} flex items-center justify-center`}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{action.title}</p>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {action.badge && (
                  <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
                    {action.badge}
                  </span>
                )}
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
