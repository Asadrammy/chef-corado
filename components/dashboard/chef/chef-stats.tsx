"use client"

import { FileText, ListOrdered, Mail, Send, Users } from "lucide-react"

import { DashboardStatCard } from "@/components/ui/dashboard-stat-card"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-3 rounded-[28px] border border-white/60 bg-card/95 p-5 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
        <DashboardStatCard
          label="Quotes sent today"
          value={`${quotesSentToday}/${quotesTarget}`}
          description="Marketplace proposals sent since midnight"
          icon={<FileText className="h-5 w-5" />}
          trend={quotesSentToday >= quotesTarget ? "Target completed." : "Below daily target."}
        />
        <Progress value={quotesProgress} />
      </div>
      <div className="space-y-3 rounded-[28px] border border-white/60 bg-card/95 p-5 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
        <DashboardStatCard
          label="Menus published"
          value={`${menusCount}/${menusTarget}`}
          description="Menus currently visible in your chef workspace"
          icon={<ListOrdered className="h-5 w-5" />}
          trend={menusCount >= menusTarget ? "Minimum completed." : "Below menu target."}
        />
        <Progress value={menusProgress} />
      </div>
      <div className="rounded-[28px] border border-white/60 bg-card/95 p-5 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
          <div className="space-y-4">
            {/* Message Response Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Message Reply Rate</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Percentage of client messages that received your reply within 24 hours over the last {responseRateWindowDays} days.
                      {messageMetrics && ` (${messageMetrics.sevenDayResponded}/${messageMetrics.sevenDayTotal} messages responded in 7 days)`}</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-lg font-semibold text-foreground">{messageResponseRate.toFixed(1)}%</span>
              </div>
              {/* Progress bar for message response rate */}
              <div className="h-1.5 w-full rounded-full bg-muted/50">
                <div
                  className={`h-full rounded-full transition-all ${
                    messageResponseRate >= 80 ? "bg-emerald-500" :
                    messageResponseRate >= 50 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(messageResponseRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Proposal Response Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposal Rate</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Percentage of nearby requests you sent proposals to this week. {requestsReceivedWeek} requests received, {proposalsSentWeek} proposals sent.</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-lg font-semibold text-foreground">{proposalResponseRate.toFixed(1)}%</span>
              </div>
              {/* Progress bar for proposal response rate */}
              <div className="h-1.5 w-full rounded-full bg-muted/50">
                <div
                  className={`h-full rounded-full transition-all ${
                    proposalResponseRate >= 50 ? "bg-emerald-500" :
                    proposalResponseRate >= 25 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(proposalResponseRate, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Summary message */}
          <div className="mt-4 space-y-1">
            <p className="text-xs text-muted-foreground">
              {messageResponseRate >= 80 && proposalResponseRate >= 50
                ? "✨ Excellent engagement metrics!"
                : messageResponseRate >= 60 || proposalResponseRate >= 30
                  ? "📈 Good response momentum."
                  : "⚡ Improve rates to boost ranking."}
            </p>
            {messageMetrics && messageMetrics.sevenDayTotal > 0 && (
              <p className="text-xs text-muted-foreground">
                {messageMetrics.sevenDayResponded}/{messageMetrics.sevenDayTotal} messages responded in 7 days
              </p>
            )}
          </div>
        </div>
      <DashboardStatCard
        label="Open requests"
        value={availableRequests}
        description="Nearby client opportunities ready for review"
        icon={<Users className="h-5 w-5" />}
        trend={availableRequests > 0 ? "New demand is available to convert." : "No nearby demand at the moment."}
      />
    </div>
    </TooltipProvider>
  )
}
