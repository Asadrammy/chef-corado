"use client"

import { TrendingUp, TrendingDown, DollarSign, Calendar, Users } from "lucide-react"

interface ModernStatCardProps {
  label: string
  value: string | number
  trend?: string
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'purple'
}

export function ModernStatCard({ label, value, trend, icon, color = 'blue' }: ModernStatCardProps) {
  const getIconBg = () => {
    switch (color) {
      case 'blue': return 'bg-blue-50 text-blue-600'
      case 'green': return 'bg-green-50 text-green-600'
      case 'purple': return 'bg-purple-50 text-purple-600'
      default: return 'bg-gray-50 text-gray-600'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer">
      <div className="flex items-start justify-between space-y-4">
        <div className="space-y-3 flex-1">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-lg ${getIconBg()} flex items-center justify-center`}>
            {icon}
          </div>
          
          {/* Content */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <p className="text-sm text-gray-600 flex items-center gap-1">
                {trend.includes('+') ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : trend.includes('-') ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : null}
                {trend}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
