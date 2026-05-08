"use client"

import { Target, Zap, Clock, Wallet, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type MatchLabel =
  | "Best Match"
  | "High Value"
  | "Fast Available"
  | "Great Price"
  | "Good Fit"
  | "Standard"

interface MatchBadgeProps {
  label: MatchLabel
  score: number
  size?: "sm" | "md" | "lg"
  showScore?: boolean
  className?: string
}

const matchConfig: Record<
  MatchLabel,
  {
    icon: React.ReactNode
    colors: string
    description: string
  }
> = {
  "Best Match": {
    icon: <Target className="h-3.5 w-3.5" />,
    colors:
      "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    description: "Top-tier match across all criteria",
  },
  "High Value": {
    icon: <Wallet className="h-3.5 w-3.5" />,
    colors:
      "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-400",
    description: "Excellent budget alignment",
  },
  "Fast Available": {
    icon: <Zap className="h-3.5 w-3.5" />,
    colors:
      "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    description: "Available and responsive",
  },
  "Great Price": {
    icon: <Wallet className="h-3.5 w-3.5" />,
    colors:
      "border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-400",
    description: "Perfect budget fit",
  },
  "Good Fit": {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    colors:
      "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    description: "Solid overall match",
  },
  Standard: {
    icon: <Clock className="h-3.5 w-3.5" />,
    colors:
      "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-400",
    description: "Within your service area",
  },
}

const sizeConfig = {
  sm: {
    badge: "px-2 py-0.5 text-[10px] gap-1",
    score: "text-[9px]",
  },
  md: {
    badge: "px-3 py-1 text-[11px] gap-1.5",
    score: "text-[10px]",
  },
  lg: {
    badge: "px-4 py-1.5 text-xs gap-2",
    score: "text-[11px]",
  },
}

export function MatchBadge({
  label,
  score,
  size = "md",
  showScore = false,
  className,
}: MatchBadgeProps) {
  const config = matchConfig[label]
  const sizes = sizeConfig[size]

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-semibold uppercase tracking-wider",
        config.colors,
        sizes.badge,
        className
      )}
      title={config.description}
    >
      {config.icon}
      <span>{label}</span>
      {showScore && (
        <span
          className={cn(
            "ml-1 rounded-full bg-white/50 px-1.5 dark:bg-black/20",
            sizes.score
          )}
        >
          {score}%
        </span>
      )}
    </div>
  )
}

interface MatchScoreRingProps {
  score: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function MatchScoreRing({
  score,
  size = "md",
  className,
}: MatchScoreRingProps) {
  const getColor = (s: number) => {
    if (s >= 90) return "text-emerald-500"
    if (s >= 80) return "text-blue-500"
    if (s >= 70) return "text-amber-500"
    if (s >= 60) return "text-purple-500"
    if (s >= 50) return "text-cyan-500"
    return "text-gray-500"
  }

  const getBgColor = (s: number) => {
    if (s >= 90) return "bg-emerald-500"
    if (s >= 80) return "bg-blue-500"
    if (s >= 70) return "bg-amber-500"
    if (s >= 60) return "bg-purple-500"
    if (s >= 50) return "bg-cyan-500"
    return "bg-gray-500"
  }

  const sizeConfig = {
    sm: { container: "h-10 w-10", text: "text-[10px]", stroke: 2 },
    md: { container: "h-14 w-14", text: "text-xs", stroke: 2.5 },
    lg: { container: "h-20 w-20", text: "text-sm", stroke: 3 },
  }

  const sizes = sizeConfig[size]
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        sizes.container,
        className
      )}
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth={sizes.stroke}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth={sizes.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn("transition-all duration-500", getColor(score))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold", sizes.text, getColor(score))}>
          {score}
        </span>
        <span className={cn("text-[8px] uppercase", getColor(score))}>
          Match
        </span>
      </div>
    </div>
  )
}

interface MatchReasonsListProps {
  reasons: string[]
  className?: string
}

export function MatchReasonsList({ reasons, className }: MatchReasonsListProps) {
  return (
    <ul className={cn("space-y-1", className)}>
      {reasons.map((reason, index) => (
        <li
          key={index}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <CheckCircle className="h-3 w-3 text-emerald-500" />
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  )
}
