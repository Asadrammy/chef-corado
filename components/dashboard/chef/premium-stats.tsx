"use client"

import { DollarSign, Calendar, Users, TrendingUp } from "lucide-react"

interface PremiumStatsProps {
  totalEarnings: number
  activeBookings: number
  availableRequests: number
}

export function PremiumStats({ totalEarnings, activeBookings, availableRequests }: PremiumStatsProps) {
  const stats = [
    {
      label: "Earnings",
      value: `$${totalEarnings.toLocaleString()}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: "green",
      bgGradient: "from-green-50 to-emerald-50"
    },
    {
      label: "Active Bookings",
      value: activeBookings,
      icon: <Calendar className="h-5 w-5" />,
      color: "blue",
      bgGradient: "from-blue-50 to-indigo-50"
    },
    {
      label: "Available Requests",
      value: availableRequests,
      icon: <Users className="h-5 w-5" />,
      color: "purple",
      bgGradient: "from-purple-50 to-pink-50"
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
      case 'blue': return 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
      case 'purple': return 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
      default: return 'bg-gradient-to-br from-gray-500 to-gray-600 text-white'
    }
  }

  const getBgGradient = (gradient: string) => {
    switch (gradient) {
      case 'from-green-50 to-emerald-50': return 'bg-gradient-to-br from-green-50 to-emerald-50'
      case 'from-blue-50 to-indigo-50': return 'bg-gradient-to-br from-blue-50 to-indigo-50'
      case 'from-purple-50 to-pink-50': return 'bg-gradient-to-br from-purple-50 to-pink-50'
      default: return 'bg-gradient-to-br from-gray-50 to-gray-100'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div key={stat.label} className="group">
          <div className={`
            bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer
            relative overflow-hidden
          `}>
            {/* Gradient background overlay */}
            <div className={`absolute inset-0 ${getBgGradient(stat.bgGradient)} opacity-30`} />
            
            <div className="relative z-10">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${getColorClasses(stat.color)} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {stat.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
