"use client"

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  highlight?: boolean
  color?: 'blue' | 'green' | 'purple' | 'orange'
}

export function StatCard({ title, value, icon, trend, highlight = false, color = 'blue' }: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
          iconBg: 'from-blue-500 to-blue-600',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-600 dark:text-blue-400'
        }
      case 'green':
        return {
          bg: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
          iconBg: 'from-green-500 to-green-600',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-600 dark:text-green-400'
        }
      case 'purple':
        return {
          bg: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
          iconBg: 'from-purple-500 to-purple-600',
          border: 'border-purple-200 dark:border-purple-800',
          text: 'text-purple-600 dark:text-purple-400'
        }
      case 'orange':
        return {
          bg: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
          iconBg: 'from-orange-500 to-orange-600',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-600 dark:text-orange-400'
        }
      default:
        return {
          bg: 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20',
          iconBg: 'from-gray-500 to-gray-600',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-600 dark:text-gray-400'
        }
    }
  }

  const colors = getColorClasses(color)
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-3 w-3" />
      case 'down': return <TrendingDown className="h-3 w-3" />
      default: return <Minus className="h-3 w-3" />
    }
  }

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }

  return (
    <Card 
      className={`
        relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer
        ${highlight ? 'md:scale-105 md:shadow-xl' : ''}
        ${isHovered ? 'scale-[1.02]' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50`} />
      
      <CardContent className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          {/* Icon with gradient background */}
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.iconBg} flex items-center justify-center text-white shadow-md`}>
            {icon}
          </div>
          
          {/* Trend indicator */}
          {trend && (
            <div className={`flex items-center text-sm font-medium ${getTrendColor(trend.direction)}`}>
              {getTrendIcon(trend.direction)}
              <span className="ml-1">
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
              </span>
            </div>
          )}
        </div>
        
        {/* Value */}
        <div className="mb-2">
          <h3 className={`text-2xl font-bold ${highlight ? 'text-3xl' : ''} text-gray-900 dark:text-white`}>
            {value}
          </h3>
        </div>
        
        {/* Title */}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {title}
        </p>
        
        {/* Hover effect overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-30' : ''}`} />
      </CardContent>
    </Card>
  )
}
