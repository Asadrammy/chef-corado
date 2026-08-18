"use client"

import * as React from "react"
import { ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, MapPin, Sparkles, Target, TrendingUp } from "lucide-react"

import { ProposalModal } from "@/components/proposal-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChefRequestRow } from "@/components/chef-request-table"
import { MatchBadge, MatchScoreRing, MatchReasonsList } from "@/components/matching/match-badge"
import { MatchResult } from "@/lib/services/smart-matching-service"
import { formatCurrency } from "@/lib/currency"
import { getServiceTypeLabel } from "@/lib/request-options"

interface ChefRequestCardProps {
  request: ChefRequestRow & {
    matchData?: MatchResult
  }
}

function getPriorityBadge(requestId: string, matchScore?: number) {
  // Use actual match score if available, otherwise fallback to hash
  if (matchScore !== undefined) {
    if (matchScore >= 90) {
      return {
        label: "Top Match",
        className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700",
      }
    }
    if (matchScore >= 75) {
      return {
        label: "Great Fit",
        className: "border-primary/30 bg-primary/15 text-primary",
      }
    }
    return null
  }

  // Fallback to hash-based for backward compatibility
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
  const [showDetails, setShowDetails] = React.useState(false)
  const eventType = request.eventType ?? "Event"
  const serviceTypeLabel = getServiceTypeLabel(request.serviceType, request.serviceTypeLabel)
  
  // Use smart match data if available, otherwise fallback to basic calculation
  const matchData = request.matchData
  // Always call useMemo to satisfy hooks rules - cannot be conditional
  const fallbackMatchScore = React.useMemo(() => {
    const distanceScore = request.distanceKm != null ? Math.max(0, 100 - request.distanceKm * 3) : 70
    const budgetScore = Math.min(100, Math.max(55, request.budget / 30))
    return Math.round(distanceScore * 0.6 + budgetScore * 0.4)
  }, [request.distanceKm, request.budget])
  const matchScore = matchData?.matchScore ?? fallbackMatchScore
  
  const matchLabel = matchData?.matchLabel ?? (matchScore >= 86 ? "Best Match" : matchScore >= 72 ? "High Value" : "Standard")
  const matchReasons = matchData?.matchReasons ?? []
  const estimatedResponseTime = matchData?.estimatedResponseTime
  
  const priorityBadge = React.useMemo(() => getPriorityBadge(request.id, matchScore), [request.id, matchScore])

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
                    {request.title || eventType}
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

          <div className="space-y-3">
            <MatchBadge label={matchLabel} score={matchScore} size="sm" showScore />
            {estimatedResponseTime && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                <span>~{estimatedResponseTime} min response</span>
              </div>
            )}
            <div className="rounded-2xl border border-white/70 bg-background/70 p-4 text-right shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">
              Budget
            </p>
            <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
              {formatCurrency(request.budget, request.currency || 'GBP')}
            </p>
            </div>
          </div>
        </div>

        {/* Match Reasons - Premium Feature */}
        {matchReasons.length > 0 && (
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
            <MatchReasonsList reasons={matchReasons} />
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{request.location}</span>
          </span>
          {request.distanceKm != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
              {request.distanceKm.toFixed(1)} km away
            </span>
          ) : request.broaderMatching ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
              Broader matching
            </span>
          ) : null}
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
          <Badge variant="outline" className="rounded-full border-border/60 bg-background/60 px-2.5 py-1">
            {serviceTypeLabel}
          </Badge>
        </div>
        
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <MatchScoreRing score={matchScore} size="sm" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{matchScore}% Match</p>
              <p className="text-muted-foreground">
                {matchData?.priceEstimate && matchData.priceEstimate.confidence > 0.5
                  ? `Est. quote: ${formatCurrency(matchData.priceEstimate.min, request.currency || 'GBP')}-${formatCurrency(matchData.priceEstimate.max, request.currency || 'GBP')}`
                  : "Review details and send a proposal"}
              </p>
            </div>
          </div>
          <ProposalModal request={request}>
            <Button
              className="brand-gradient-button h-11 rounded-2xl px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/25"
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
