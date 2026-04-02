"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LucideIcon, FileText, Users, Calendar, DollarSign, TrendingUp, Activity, Star, ArrowUp, ArrowDown } from "lucide-react"

interface DashboardStatsProps {
  title: string
  value: string | number
  description: string
  icon: string
  loading?: boolean
  error?: string
  trend?: number
  trendLabel?: string
}

const iconMap: Record<string, LucideIcon> = {
  FileText: FileText,
  Users: Users,
  Calendar: Calendar,
  DollarSign: DollarSign,
  TrendingUp: TrendingUp,
  Activity: Activity,
  Star: Star,
}

const iconBgMap: Record<string, string> = {
  FileText: "bg-blue-50 dark:bg-blue-900/20",
  Users: "bg-purple-50 dark:bg-purple-900/20", 
  Calendar: "bg-orange-50 dark:bg-orange-900/20",
  DollarSign: "bg-green-50 dark:bg-green-900/20",
  TrendingUp: "bg-blue-50 dark:bg-blue-900/20",
  Activity: "bg-purple-50 dark:bg-purple-900/20",
  Star: "bg-orange-50 dark:bg-orange-900/20",
}

export function DashboardStats({ title, value, description, icon, loading, error, trend, trendLabel }: DashboardStatsProps) {
  const Icon = iconMap[icon] || FileText
  const iconBgClass = iconBgMap[icon] || "bg-blue-50 dark:bg-blue-900/20"
  
  if (loading) {
    return (
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-12 w-12 rounded-xl" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200/60 dark:border-red-800/60 shadow-sm hover:shadow-md transition-all duration-300 ease-out hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">{title}</CardTitle>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-900/20">
            <Icon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">Error</div>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = trend && trend > 0 ? ArrowUp : ArrowDown
  const trendColor = trend && trend > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`h-6 w-6 ${icon === "Users" || icon === "Activity" ? "text-purple-600 dark:text-purple-400" : icon === "Calendar" || icon === "Star" ? "text-orange-600 dark:text-orange-400" : icon === "DollarSign" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-foreground">{value}</div>
          {trend && (
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{description}</p>
          {trendLabel && (
            <p className={`text-sm font-medium ${trendColor}`}>{trendLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
