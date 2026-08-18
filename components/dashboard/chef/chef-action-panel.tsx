import Link from "next/link"
import { ArrowRight, CalendarRange, ClipboardList, Send, Sparkles, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface PendingTask {
  id: string
  title: string
  description: string
  href: string
  priority: "high" | "medium" | "low"
}

interface ChefActionPanelProps {
  profileCompletion: number
  pendingTasks: PendingTask[]
  activeBookings: number
  availableRequests: number
  quotesSentToday: number
  menusCount: number
  menusTarget: number
  responseRate: number
  responseRateWindowDays: number
}

const quickLinks = [
  {
    title: "Send Quote",
    href: "/dashboard/chef/requests",
    icon: Send,
    highlight: true,
  },
  {
    title: "Manage experiences",
    href: "/dashboard/chef/experiences",
    icon: Sparkles,
  },
  {
    title: "Set availability",
    href: "/dashboard/chef/availability",
    icon: CalendarRange,
  },
  {
    title: "View bookings",
    href: "/dashboard/chef/bookings",
    icon: ClipboardList,
  },
]

function getPriorityClasses(priority: PendingTask["priority"]) {
  switch (priority) {
    case "high":
      return "bg-destructive/10 text-destructive"
    case "medium":
      return "bg-primary/10 text-primary"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function ChefActionPanel({
  profileCompletion,
  pendingTasks,
  activeBookings,
  availableRequests,
  quotesSentToday,
  menusCount,
  menusTarget,
  responseRate,
  responseRateWindowDays,
}: ChefActionPanelProps) {
  const suggestions = [
    availableRequests > 0
      ? {
          id: "quotes",
          title: "Send quotes to suitable requests",
          description: `You have sent ${quotesSentToday} quote${quotesSentToday === 1 ? "" : "s"} today. Each client request can receive up to 10 quotes total across the platform.`,
        }
      : null,
    menusCount < menusTarget
      ? {
          id: "menus",
          title: `Add ${Math.max(menusTarget - menusCount, 0)} more menus`,
          description: "More menus improve marketplace visibility and search ranking.",
        }
      : null,
    responseRate < 60
      ? {
          id: "responses",
          title: "Reply faster to open requests",
          description: `Your response rate is ${responseRate.toFixed(1)}% over the last ${responseRateWindowDays} days.`,
        }
      : null,
    availableRequests === 0
      ? {
          id: "availability",
          title: "Your calendar is quiet next week",
          description: "Open more availability or expand your radius to boost demand.",
        }
      : null,
  ].filter(Boolean) as Array<{ id: string; title: string; description: string }>

  return (
    <div className="space-y-4">
      <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10">
        <CardHeader className="space-y-1 pb-3">
          <div className="text-primary inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Assistant panel
          </div>
          <CardTitle className="text-foreground text-lg font-semibold tracking-tight">Action center</CardTitle>
          <p className="text-muted-foreground text-sm leading-6">Focus on the next actions that improve conversion.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,249,255,0.88))] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-foreground text-sm font-medium tracking-tight">Profile completion</p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Complete your profile to appear stronger in search and requests.
                </p>
              </div>
              <span className="text-foreground rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-sm font-semibold shadow-sm dark:border-white/10 dark:bg-white/5">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="mt-4 h-2.5 rounded-full" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">Active bookings</p>
              <p className="text-foreground mt-2 text-xl font-semibold tracking-tight">{activeBookings}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">Open requests</p>
              <p className="text-foreground mt-2 text-xl font-semibold tracking-tight">{availableRequests}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-foreground text-sm font-medium tracking-tight">Pending tasks</p>
            {pendingTasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-4 shadow-inner">
                <p className="text-foreground text-sm font-medium tracking-tight">You&apos;re in good shape</p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Your dashboard essentials are set up. Keep responding quickly to new demand.
                </p>
              </div>
            ) : (
              pendingTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="group rounded-3xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,249,255,0.88))] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="from-primary/15 to-background text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <p className="text-foreground text-sm font-medium tracking-tight">{task.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${getPriorityClasses(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-5">{task.description}</p>
                    </div>
                  </div>
                  <Button variant="ghost" className="text-primary mt-3 h-auto rounded-full px-0 py-0 text-sm transition-transform duration-300 group-hover:translate-x-0.5" asChild>
                    <Link href={task.href}>
                      Resolve
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <p className="text-foreground text-sm font-medium tracking-tight">Smart suggestions</p>
            {suggestions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-4 shadow-inner">
                <p className="text-foreground text-sm font-medium tracking-tight">You&apos;re on track</p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Keep responding quickly and update availability as new requests arrive.
                </p>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-3xl border border-white/60 bg-white/70 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-foreground text-sm font-medium tracking-tight">{suggestion.title}</p>
                  <p className="mt-1 text-xs leading-5">{suggestion.description}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-lg font-semibold tracking-tight">Shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quickLinks.map((item) => {
            const Icon = item.icon

            return (
              <Button
                key={item.href}
                variant={item.highlight ? "default" : "outline"}
                className={
                  item.highlight
                    ? "brand-gradient-button h-12 w-full justify-between rounded-2xl px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
                    : "text-foreground h-12 w-full justify-between rounded-2xl border-white/70 bg-white/70 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                }
                asChild
              >
                <Link href={item.href}>
                  <span className="flex items-center gap-2">
                    <span className={item.highlight 
                      ? "flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 shadow-sm" 
                      : "from-primary/15 to-background flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm"
                    }>
                      <Icon className={item.highlight ? "h-4 w-4 text-white" : "text-primary h-4 w-4"} />
                    </span>
                    {item.title}
                  </span>
                  <ArrowRight className={item.highlight ? "h-4 w-4 text-white" : "h-4 w-4"} />
                </Link>
              </Button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
