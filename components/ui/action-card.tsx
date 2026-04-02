"use client"

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ActionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  badge?: string | number | null | undefined
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'gray'
  disabled?: boolean
}

export function ActionCard({ title, description, icon, href, badge, color = 'blue', disabled = false }: ActionCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
          iconBg: 'from-blue-500 to-blue-600',
          border: 'border-blue-200 dark:border-blue-800',
          hover: 'hover:border-blue-300 dark:hover:border-blue-700'
        }
      case 'green':
        return {
          bg: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
          iconBg: 'from-green-500 to-green-600',
          border: 'border-green-200 dark:border-green-800',
          hover: 'hover:border-green-300 dark:hover:border-green-700'
        }
      case 'purple':
        return {
          bg: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
          iconBg: 'from-purple-500 to-purple-600',
          border: 'border-purple-200 dark:border-purple-800',
          hover: 'hover:border-purple-300 dark:hover:border-purple-700'
        }
      case 'orange':
        return {
          bg: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
          iconBg: 'from-orange-500 to-orange-600',
          border: 'border-orange-200 dark:border-orange-800',
          hover: 'hover:border-orange-300 dark:hover:border-orange-700'
        }
      default:
        return {
          bg: 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20',
          iconBg: 'from-gray-500 to-gray-600',
          border: 'border-gray-200 dark:border-gray-800',
          hover: 'hover:border-gray-300 dark:hover:border-gray-700'
        }
    }
  }

  const colors = getColorClasses(color)

  return (
    <Link href={href}>
      <Card 
        className={`
          relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isHovered ? 'scale-[1.02]' : ''}
        `}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50`} />
        
        <CardContent className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icon with gradient background */}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.iconBg} flex items-center justify-center text-white shadow-md`}>
                {icon}
              </div>
              
              {/* Text content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  {title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                  {description}
                </p>
              </div>
            </div>
            
            {/* Badge or hover indicator */}
            <div className="flex items-center">
              {badge ? (
                <Badge className={`bg-gradient-to-r ${colors.iconBg} text-white border-0 text-xs`}>
                  {badge}
                </Badge>
              ) : (
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors.iconBg} flex items-center justify-center text-white opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : ''}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Hover effect line */}
          <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${colors.iconBg} transform scale-x-0 transition-transform duration-300 ${isHovered ? 'scale-x-100' : ''}`} />
        </CardContent>
      </Card>
    </Link>
  )
}
