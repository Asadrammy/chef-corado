"use client"

import { FileText, ListOrdered, Mail, Send, Users } from "lucide-react"

import { DashboardStatCard } from "@/components/ui/dashboard-stat-card"

interface ChefStatsProps {
  availableRequests: number
  quotesSentToday: number
  quotesTarget: number
  menusCount: number
  menusTarget: number
  responseRate: number
  responseRateWindowDays: 7 | 30
  /** Message response rate: % of client messages that received a chef reply within 24 hours */
  messageResponseRate: number
  /** Proposal response rate: % of requests in radius that received proposals */
  proposalResponseRate: number
  /** Total requests received in the last 7 days within radius */
  requestsReceivedWeek: number
  /** Total proposals sent in the last 7 days */
  proposalsSentWeek: number
  /** Detailed message response metrics */
  messageMetrics?: {
    sevenDayTotal: number
    sevenDayResponded: number
    thirtyDayTotal: number
    thirtyDayResponded: number
  }
}

export function ChefStats({
  availableRequests,
  quotesSentToday,
  quotesTarget,
  menusCount,
  menusTarget,
  responseRate,
  responseRateWindowDays,
  messageResponseRate,
  proposalResponseRate,
  requestsReceivedWeek,
  proposalsSentWeek,
  messageMetrics,
}: ChefStatsProps) {
  const quotesProgress = Math.min((quotesSentToday / quotesTarget) * 100, 100)
  const menusProgress = Math.min((menusCount / menusTarget) * 100, 100)

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        label="Quotes sent today"
        value={`${quotesSentToday}/${quotesTarget}`}
        description="Marketplace proposals sent since midnight"
        icon={<FileText className="h-5 w-5" />}
        trend={quotesSentToday >= quotesTarget ? "Target completed." : "Below daily target."}
      />
      <DashboardStatCard
        label="Menus published"
        value={`${menusCount}/${menusTarget}`}
        description="Menus currently visible in your chef workspace"
        icon={<ListOrdered className="h-5 w-5" />}
        trend={menusCount >= menusTarget ? "Minimum completed." : "Below menu target."}
      />
      <DashboardStatCard
        label="Message reply rate"
        value={`${messageResponseRate.toFixed(1)}%`}
        description={`% of messages replied within 24h (last ${responseRateWindowDays} days)`}
        icon={<Mail className="h-5 w-5" />}
        trend={messageResponseRate >= 80 ? "Excellent response time" : messageResponseRate >= 60 ? "Good response time" : "Improve response time"}
      />
      <DashboardStatCard
        label="Open requests"
        value={availableRequests}
        description="Nearby client opportunities ready for review"
        icon={<Users className="h-5 w-5" />}
        trend={availableRequests > 0 ? "New demand is available to convert." : "No nearby demand at the moment."}
      />
    </div>
  )
}
