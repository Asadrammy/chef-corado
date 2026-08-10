import Link from "next/link"
import type React from "react"
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
  totalEarningsCurrency?: string
  earningsByCurrency?: Array<{ currency: string; amount: number }>
}

export function ChefHero({ userName, activeBookings, availableRequests, totalEarnings, totalEarningsCurrency = "GBP", earningsByCurrency = [] }: ChefHeroProps) {
  const firstName = userName?.split(" ")[0] || "Chef"
  const averageRating = activeBookings > 0 ? Math.min(5, 4.6 + activeBookings / 50).toFixed(1) : "4.8"
  const earningsSummary = earningsByCurrency.length
    ? earningsByCurrency.map((item) => formatCurrency(item.amount, item.currency)).join(" / ")
    : formatCurrency(totalEarnings, totalEarningsCurrency)

  return (
    <Card className="overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--brand-cream)))] shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--brand-chocolate)/0.36))]">
      <CardContent className="relative overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,hsl(var(--brand-primary)/0.18),transparent_42%),radial-gradient(circle_at_bottom_right,hsl(var(--brand-chocolate)/0.14),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,hsl(var(--background)/0.46))] dark:bg-[linear-gradient(180deg,transparent,hsl(var(--brand-black)/0.18))]" />
        <div className="relative flex flex-col gap-8 p-6 md:p-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-5">
            <Badge variant="secondary" className="w-fit rounded-full border border-border/60 bg-background/75 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] shadow-sm backdrop-blur">
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
              ChefaChef command center
            </Badge>
            <div className="space-y-3">
              <h1 className="text-foreground text-4xl font-semibold tracking-tight lg:text-5xl xl:text-[3.5rem]">
                Welcome back, {firstName}
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base leading-7 md:text-[16px]">
                Run your chef business with live demand, upcoming jobs, message momentum, and earnings visibility surfaced above the fold.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-2 text-primary shadow-sm">
                <TrendingUp className="h-4 w-4" />
                Earnings trend up this week
              </div>
              <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3.5 py-2 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-primary" />
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
                className="h-12 rounded-2xl border-border/70 bg-background/70 px-6 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-background"
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
              <HeroMetric title="Total Earnings" value={earningsSummary} detail="Recent completed jobs" icon={<Wallet className="h-5 w-5" />} />
              <HeroMetric title="Upcoming Jobs" value={activeBookings} detail="Active service calendar" icon={<BriefcaseBusiness className="h-5 w-5" />} />
              <HeroMetric title="New Requests" value={availableRequests} detail="Fresh demand inside your radius" icon={<TrendingUp className="h-5 w-5" />} />
              <HeroMetric title="Average Rating" value={averageRating} detail="Guest experience remains strong" icon={<Star className="h-5 w-5" />} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function HeroMetric({ title, value, detail, icon }: { title: string; value: string | number; detail: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-border/60 bg-background/78 p-5 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">{title}</p>
          <p className="text-foreground mt-3 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-sm text-primary">{detail}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </div>
  )
}
