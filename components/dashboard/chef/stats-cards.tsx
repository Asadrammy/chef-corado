"use client"

import { DollarSign, Calendar, Users } from "lucide-react"

interface StatsCardsProps {
  totalEarnings: number
  activeBookings: number
  availableRequests: number
}

export function StatsCards({ totalEarnings, activeBookings, availableRequests }: StatsCardsProps) {
  const stats = [
    {
      label: "Earnings",
      value: `$${totalEarnings.toLocaleString()}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: "green"
    },
    {
      label: "Active Bookings",
      value: activeBookings,
      icon: <Calendar className="h-5 w-5" />,
      color: "blue"
    },
    {
      label: "Available Requests",
      value: availableRequests,
      icon: <Users className="h-5 w-5" />,
      color: "purple"
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-50 text-green-600'
      case 'blue': return 'bg-blue-50 text-blue-600'
      case 'purple': return 'bg-purple-50 text-purple-600'
      default: return 'bg-gray-50 text-gray-600'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg ${getColorClasses(stat.color)} flex items-center justify-center`}>
              {stat.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
