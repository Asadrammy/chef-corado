"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, Wallet, Target, Calendar, AlertCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"

interface RevenueIntelligenceProps {
  totalEarnings: number
  earningsTrend: Array<{ date: string; earnings: number }>
  completedBookings: number
  activeBookings: number
  monthlyGoal?: number
}

export function RevenueIntelligence({
  totalEarnings,
  earningsTrend,
  completedBookings,
  activeBookings,
  monthlyGoal = 5000,
}: RevenueIntelligenceProps) {
  // Calculate metrics
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "short" })
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const currentDay = new Date().getDate()
  const monthProgress = (currentDay / daysInMonth) * 100

  // Calculate this month's earnings from trend data
  const thisMonthEarnings = earningsTrend
    .filter((item) => item.date.includes(currentMonth))
    .reduce((sum, item) => sum + item.earnings, 0)

  // Calculate daily average
  const dailyAverage = currentDay > 0 ? thisMonthEarnings / currentDay : 0

  // Project month-end earnings
  const projectedEarnings = dailyAverage * daysInMonth

  // Calculate progress to goal
  const goalProgress = Math.min((thisMonthEarnings / monthlyGoal) * 100, 100)

  // Calculate if on track
  const expectedAtThisPoint = (monthlyGoal / daysInMonth) * currentDay
  const onTrack = thisMonthEarnings >= expectedAtThisPoint

  // Calculate week-over-week trend
  const recentEarnings = earningsTrend.slice(-7).reduce((sum, item) => sum + item.earnings, 0)
  const previousEarnings = earningsTrend.slice(-14, -7).reduce((sum, item) => sum + item.earnings, 0)
  const weekTrend = previousEarnings > 0
    ? ((recentEarnings - previousEarnings) / previousEarnings) * 100
    : 0

  // Calculate average booking value
  const avgBookingValue = completedBookings > 0
    ? totalEarnings / completedBookings
    : 0

  const metrics = [
    {
      label: "This Month",
      value: formatCurrency(thisMonthEarnings),
      subtext: `of ${formatCurrency(monthlyGoal)} goal`,
      progress: goalProgress,
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      label: "Projected",
      value: formatCurrency(projectedEarnings),
      subtext: onTrack ? "On track to hit goal" : "Below target pace",
      trend: weekTrend,
      icon: weekTrend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
    },
    {
      label: "Avg per Booking",
      value: formatCurrency(avgBookingValue),
      subtext: `${completedBookings} completed`,
      icon: <Target className="h-4 w-4" />,
    },
    {
      label: "Active Pipeline",
      value: `${activeBookings}`,
      subtext: "Upcoming events",
      icon: <Calendar className="h-4 w-4" />,
    },
  ]

  return (
    <Card className="overflow-hidden rounded-[28px] border border-white/60 bg-card/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10">
      <CardHeader className="space-y-2 pb-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          <TrendingUp className="h-3.5 w-3.5" />
          Revenue Intelligence
        </div>
        <CardTitle className="text-xl font-semibold tracking-tight">
          Earnings Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Month Progress</span>
            <span className="font-medium">{currentDay} of {daysInMonth} days</span>
          </div>
          <Progress value={monthProgress} className="h-2" />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/60 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                {metric.icon}
                <span className="text-xs font-medium uppercase tracking-wider">
                  {metric.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.subtext}</p>
              {metric.progress !== undefined && (
                <Progress value={metric.progress} className="mt-2 h-1.5" />
              )}
              {metric.trend !== undefined && (
                <div
                  className={cn(
                    "mt-2 flex items-center gap-1 text-xs font-medium",
                    metric.trend >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {metric.trend >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(metric.trend).toFixed(1)}% vs last week
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status Alert */}
        {!onTrack && thisMonthEarnings > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-400">
                Below Target Pace
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-500">
                You need {formatCurrency(expectedAtThisPoint - thisMonthEarnings)} more 
                to be on track. Consider sending more quotes to increase bookings.
              </p>
            </div>
          </div>
        )}

        {onTrack && thisMonthEarnings > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-400">
                On Track to Hit Goal
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-500">
                You&apos;re {formatCurrency(thisMonthEarnings - expectedAtThisPoint)} ahead of pace. 
                Keep up the great work!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
