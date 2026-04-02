"use client"

import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, Star } from "lucide-react"

interface EngagingStatCardProps {
  label: string
  value: string | number
  message: string
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'purple' | 'orange'
  highlight?: boolean
}

export function EngagingStatCard({ label, value, message, icon, color = 'blue', highlight = false }: EngagingStatCardProps) {
  const getIconBg = () => {
    switch (color) {
      case 'blue': return 'bg-blue-50 text-blue-600'
      case 'green': return 'bg-green-50 text-green-600'
      case 'purple': return 'bg-purple-50 text-purple-600'
      case 'orange': return 'bg-orange-50 text-orange-600'
      default: return 'bg-gray-50 text-gray-600'
    }
  }

  return (
    <div className={`
      ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}
      border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer
      ${highlight ? 'ring-2 ring-blue-100' : ''}
    `}>
      <div className="flex items-start justify-between space-y-4">
        <div className="space-y-3 flex-1">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl ${getIconBg()} flex items-center justify-center`}>
            {icon}
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600 italic">{message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
