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
        "group rounded-2xl border-border/60 bg-card/95 shadow-sm shadow-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10",
        className
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium tracking-tight">{label}</p>
          <p className="text-foreground text-3xl font-semibold tracking-tight">{value}</p>
          {description ? <p className="text-muted-foreground max-w-[18rem] text-xs leading-5">{description}</p> : null}
        </div>
        <div className="from-primary/15 via-primary/10 to-background text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-gradient-to-br shadow-sm transition-transform duration-300 group-hover:scale-105 dark:border-white/10">
          {icon}
        </div>
      </CardContent>
      {trend ? (
        <div className="border-border/60 text-muted-foreground border-t px-5 py-3 text-xs leading-5">{trend}</div>
      ) : null}
    </Card>
  )
}
