import { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DashboardStatCardProps {
  label: string
  value: string | number
  description?: string
  icon: ReactNode
  trend?: string
  className?: string
}

export function DashboardStatCard({
  label,
  value,
  description,
  icon,
  trend,
  className,
}: DashboardStatCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-[28px] border border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,249,255,0.88))] shadow-lg shadow-slate-900/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_55%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_52%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
      <CardContent className="relative flex min-h-[196px] flex-col justify-between gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">{label}</p>
            <p className="text-foreground text-4xl font-semibold tracking-tight sm:text-[2.6rem]">{value}</p>
          </div>
          <div className="from-primary/20 via-sky-500/10 to-background text-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/60 bg-gradient-to-br shadow-lg shadow-slate-900/5 transition-transform duration-300 group-hover:scale-105 dark:border-white/10">
            {icon}
          </div>
        </div>

        <div className="space-y-3">
          {description ? <p className="text-muted-foreground max-w-[18rem] text-sm leading-6">{description}</p> : null}
          {trend ? (
            <div className="inline-flex w-fit items-center rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm dark:text-emerald-300">
              {trend}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
