import Link from "next/link"
import { ArrowRight, CheckCircle2, Wallet, BriefcaseBusiness, Sparkles, Star, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/currency"

interface ChefHeroProps {
  userName: string
  activeBookings: number
  availableRequests: number
  totalEarnings: number
}

export function ChefHero({ userName, activeBookings, availableRequests, totalEarnings }: ChefHeroProps) {
  const firstName = userName?.split(" ")[0] || "Chef"
  const averageRating = activeBookings > 0 ? Math.min(5, 4.6 + activeBookings / 50).toFixed(1) : "4.8"

  return (
    <Card className="overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,39,0.98),rgba(24,24,34,0.96))]">
      <CardContent className="relative overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.20),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.42))] dark:bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.02))]" />
        <div className="relative flex flex-col gap-8 p-6 md:p-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-5">
            <Badge variant="secondary" className="w-fit rounded-full border border-white/60 bg-white/75 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Marketplace command center
            </Badge>
            <div className="space-y-3">
              <h1 className="text-foreground text-4xl font-semibold tracking-tight lg:text-5xl xl:text-[3.5rem]">
                Welcome back, {firstName}
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-7 md:text-[16px]">
                Run your chef business like a premium marketplace brand with live demand, upcoming jobs, message momentum, and earnings visibility surfaced above the fold.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3.5 py-2 text-emerald-700 shadow-sm dark:text-emerald-300">
                <TrendingUp className="h-4 w-4" />
                Earnings trend up this week
              </div>
              <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3.5 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <span className="bg-emerald-500 h-2 w-2 rounded-full" />
                Live activity synced across requests, bookings, and chat
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="brand-gradient-button h-12 rounded-2xl px-6 text-sm font-medium shadow-xl shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/25" asChild>
                <Link href="/dashboard/chef/requests">
                  Review Requests
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-2xl border-white/70 bg-white/70 px-6 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                asChild
              >
                <Link href="/dashboard/chef/profile">
                  Upgrade Profile
                  <CheckCircle2 className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 xl:min-w-[520px] xl:max-w-[560px]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/60 bg-white/78 p-5 shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">Total Earnings</p>
                    <p className="text-foreground mt-3 text-3xl font-semibold tracking-tight">{formatCurrency(totalEarnings)}</p>
                    <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">↑ 12% from recent completed jobs</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/60 bg-white/78 p-5 shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">Upcoming Jobs</p>
                    <p className="text-foreground mt-3 text-3xl font-semibold tracking-tight">{activeBookings}</p>
                    <p className="mt-2 text-sm text-primary">↑ Active service calendar in motion</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/60 bg-white/78 p-5 shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">New Requests</p>
                    <p className="text-foreground mt-3 text-3xl font-semibold tracking-tight">{availableRequests}</p>
                    <p className="mt-2 text-sm text-sky-600 dark:text-sky-400">↑ Fresh demand inside your radius</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/60 bg-white/78 p-5 shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">Average Rating</p>
                    <p className="text-foreground mt-3 text-3xl font-semibold tracking-tight">{averageRating}</p>
                    <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">↑ Guest experience remains strong</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500">
                    <Star className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
