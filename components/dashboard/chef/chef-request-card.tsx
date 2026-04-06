"use client"

import * as React from "react"
import { ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, MapPin, Sparkles } from "lucide-react"

import { ProposalModal } from "@/components/proposal-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChefRequestRow } from "@/components/chef-request-table"

interface ChefRequestCardProps {
  request: ChefRequestRow
}

function getEventType(details?: string | null) {
  if (!details) return "General"

  const normalized = details.toLowerCase()

  if (normalized.includes("corporate")) return "Corporate"
  if (normalized.includes("wedding")) return "Wedding"
  if (normalized.includes("birthday")) return "Birthday"
  if (normalized.includes("anniversary")) return "Anniversary"

  return "Event"
}

function getPriorityBadge(requestId: string) {
  const hash = requestId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const normalized = hash % 100

  if (normalized > 70) {
    return {
      label: "Urgent match",
      className: "border-destructive/20 bg-destructive/10 text-destructive",
    }
  }

  if (normalized > 40) {
    return {
      label: "New request",
      className: "border-primary/20 bg-primary/10 text-primary",
    }
  }

  return null
}

export function ChefRequestCard({ request }: ChefRequestCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const eventType = getEventType(request.details)
  const priorityBadge = React.useMemo(() => getPriorityBadge(request.id), [request.id])

  return (
    <Card
      className="group rounded-[24px] border border-background/40 bg-background/95 shadow-lg shadow-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 dark:border-background/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Opportunity match
            </div>

            <div className="flex items-start gap-3">
              <div className="from-primary/15 via-primary/10 to-background text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-background/40 bg-gradient-to-br shadow-sm dark:border-background/20">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-foreground text-xl font-semibold tracking-tight line-clamp-1">
                    {eventType} Event
                  </h3>
                  {priorityBadge ? (
                    <Badge className={priorityBadge.className}>{priorityBadge.label}</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-sm leading-6 line-clamp-2">
                  {request.details || "Client details will appear here once more information is provided."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-background/70 p-4 text-right shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">
              Budget
            </p>
            <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
              ${request.budget.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{request.location}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
            <CalendarDays className="h-4 w-4" />
            {new Date(request.eventDate).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
            <Clock3 className="h-4 w-4" />
            Evening service
          </span>
          <Badge variant="outline" className="rounded-full border-border/60 bg-background/60 px-2.5 py-1">
            {eventType}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm leading-6">
            Review the request details and send a proposal tailored to the client’s budget and event needs.
          </p>
          <ProposalModal request={request}>
            <Button
              className="h-11 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25"
            >
              Send Proposal
              <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${isHovered ? "translate-x-0.5" : ""}`} />
            </Button>
          </ProposalModal>
        </div>
      </div>
    </Card>
  )
}
