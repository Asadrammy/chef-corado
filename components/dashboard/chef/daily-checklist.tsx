"use client"

import * as React from "react"
import { CheckCircle2, Circle, Clock, Wallet, FileText, MessageSquare, TrendingUp, Users } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type ChecklistItem = {
  id: string
  title: string
  description: string
  completed: boolean
  href: string
  icon: React.ReactNode
  priority: "high" | "medium" | "low"
  reward?: string
}

interface DailyChecklistProps {
  quotesSentToday: number
  responseRate: number
  availableRequests: number
  activeBookings: number
  unreadMessages?: number
  pendingProposals?: number
  /** Message response rate - used for checklist calculation */
  messageResponseRate?: number
  /** Proposal response rate - used for checklist calculation */
  proposalResponseRate?: number
}

export function DailyChecklist({
  quotesSentToday,
  responseRate,
  availableRequests,
  activeBookings,
  unreadMessages = 0,
  pendingProposals = 0,
  messageResponseRate = responseRate,
  proposalResponseRate = 0,
}: DailyChecklistProps) {
  const checklistItems: ChecklistItem[] = [
    {
      id: "check-requests",
      title: "Review open requests",
      description: `${availableRequests} suitable requests waiting for review`,
      completed: availableRequests === 0,
      href: "/dashboard/chef/requests",
      icon: <Users className="h-4 w-4" />,
      priority: availableRequests > 3 ? "high" : "medium",
      reward: "Convert to paid bookings",
    },
    {
      id: "send-quotes",
      title: "Send quotes to suitable requests",
      description: `Quote activity today: ${quotesSentToday}. Each client request can receive up to 10 quotes total across the platform.`,
      completed: availableRequests === 0,
      href: "/dashboard/chef/requests",
      icon: <FileText className="h-4 w-4" />,
      priority: availableRequests > 0 ? "high" : "low",
      reward: "Relevant quotes create stronger booking opportunities",
    },
    {
      id: "respond-messages",
      title: "Respond to messages",
      description: unreadMessages > 0 ? `${unreadMessages} unread` : "All caught up",
      completed: unreadMessages === 0,
      href: "/dashboard/chef/messages",
      icon: <MessageSquare className="h-4 w-4" />,
      priority: unreadMessages > 0 ? "high" : "low",
      reward: "Fast replies boost your ranking",
    },
    {
      id: "check-bookings",
      title: "Review upcoming bookings",
      description: `${activeBookings} active events`,
      completed: activeBookings === 0,
      href: "/dashboard/chef/bookings",
      icon: <Clock className="h-4 w-4" />,
      priority: "medium",
    },
    {
      id: "maintain-response-rate",
      title: "Maintain message response rate",
      description: `${messageResponseRate.toFixed(0)}% message reply rate (target: 80%+)`,
      completed: messageResponseRate >= 80,
      href: "/dashboard/chef/messages",
      icon: <TrendingUp className="h-4 w-4" />,
      priority: messageResponseRate < 60 ? "high" : "medium",
      reward: "Boosts match ranking",
    },
    {
      id: "send-proposals",
      title: "Respond to requests",
      description: `${proposalResponseRate.toFixed(0)}% of nearby requests have proposals from you`,
      completed: proposalResponseRate >= 50,
      href: "/dashboard/chef/requests",
      icon: <Users className="h-4 w-4" />,
      priority: proposalResponseRate < 30 ? "high" : "medium",
      reward: "More proposals = more bookings",
    },
  ]

  const completedCount = checklistItems.filter((item) => item.completed).length
  const progress = (completedCount / checklistItems.length) * 100

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
      case "medium":
        return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
      default:
        return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
    }
  }

  return (
    <Card className="overflow-hidden rounded-[28px] border border-white/60 bg-card/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              <Wallet className="h-3.5 w-3.5" />
              Daily Business Goals
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight">
              Chef&apos;s Daily Checklist
            </CardTitle>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              {completedCount}/{checklistItems.length}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {checklistItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "group flex items-start gap-3 rounded-2xl border p-4 transition-all duration-200",
              item.completed
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                : "border-white/60 bg-white/50 hover:border-primary/20 hover:bg-primary/5 dark:border-white/10 dark:bg-white/5"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                item.completed
                  ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900 dark:text-emerald-400"
                  : "border-muted bg-muted/50 text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary"
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                item.icon
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "font-medium",
                    item.completed && "text-emerald-700 opacity-60 dark:text-emerald-400"
                  )}
                >
                  {item.title}
                </p>
                {!item.completed && (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      getPriorityColor(item.priority)
                    )}
                  >
                    {item.priority}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              {item.reward && !item.completed && (
                <p className="text-xs font-medium text-primary">{item.reward}</p>
              )}
            </div>
            {!item.completed && (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
            )}
          </Link>
        ))}

        {progress === 100 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="font-semibold text-emerald-800 dark:text-emerald-400">
              🎉 Daily goals complete!
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-500">
              Great work today. You&apos;re maximizing your marketplace potential.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
