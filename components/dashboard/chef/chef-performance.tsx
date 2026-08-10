"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Wallet, Sparkles, Star, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DashboardStatCard } from "@/components/ui/dashboard-stat-card"
import { formatCurrency } from "@/lib/currency"

interface ChefPerformanceProps {
  totalEarnings: number
  totalEarningsCurrency?: string
  earningsByCurrency?: Array<{ currency: string; amount: number }>
  completedBookings: number
  earningsTrend: Array<{ date: string; earnings: number; currency?: string }>
  averageRating: number
}

const chartConfig = {
  earnings: {
    label: "Earnings",
    color: "hsl(var(--primary))",
  },
}

function currencyTickFormatter(value: number, currency: string) {
  if (value >= 1000) {
    return `${formatCurrency(value / 1000, currency)}k`
  }

  return formatCurrency(value, currency)
}

function getTrendSummary(earningsTrend: Array<{ date: string; earnings: number }>) {
  const total = earningsTrend.reduce((sum, item) => sum + item.earnings, 0)
  const midpoint = Math.ceil(earningsTrend.length / 2)
  const previous = earningsTrend.slice(0, midpoint).reduce((sum, item) => sum + item.earnings, 0)
  const current = earningsTrend.slice(midpoint).reduce((sum, item) => sum + item.earnings, 0)

  if (previous === 0) {
    return {
      label: total > 0 ? "+100%" : "0%",
      description: total > 0 ? "Activity has started in the latest period." : "No completed payouts in this window.",
    }
  }

  const change = ((current - previous) / previous) * 100

  return {
    label: `${change >= 0 ? "+" : ""}${Math.round(change)}%`,
    description: change >= 0 ? "Growth versus the first half of this period." : "Down versus the first half of this period.",
  }
}

export function ChefPerformance({
  totalEarnings,
  totalEarningsCurrency = "GBP",
  earningsByCurrency = [],
  completedBookings,
  earningsTrend,
  averageRating,
}: ChefPerformanceProps) {
  const trendSummary = getTrendSummary(earningsTrend)
  const earningsSummary = earningsByCurrency.length
    ? earningsByCurrency.map((item) => formatCurrency(item.amount, item.currency)).join(" / ")
    : formatCurrency(totalEarnings, totalEarningsCurrency)

  return (
    <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <div className="text-primary inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Earnings analytics
            </div>
            <CardTitle className="text-foreground text-xl font-semibold tracking-tight">Performance</CardTitle>
            <p className="text-muted-foreground text-sm leading-6">
              Real earnings trend from completed bookings over the last 14 days.
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              {trendSummary.label}
            </div>
            <p className="text-muted-foreground mt-1 text-xs leading-5">{trendSummary.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DashboardStatCard
            label="Net earnings"
            value={earningsSummary}
            description="Chef payout total from completed payments"
            icon={<Wallet className="h-5 w-5" />}
          />
          <DashboardStatCard
            label="Completed bookings"
            value={completedBookings}
            description="Delivered experiences and proposal-based bookings"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <DashboardStatCard
            label="Average rating"
            value={averageRating > 0 ? averageRating.toFixed(1) : "-"}
            description={averageRating > 0 ? "Average customer review score" : "No reviews yet"}
            icon={<Star className="h-5 w-5" />}
          />
        </div>

        <div className="rounded-[26px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,248,255,0.9))] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
          {earningsTrend.length === 0 ? (
            <div className="py-12 text-center">
              <div className="from-primary/15 to-background text-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
                <Wallet className="h-7 w-7" />
              </div>
              <p className="text-foreground text-base font-semibold tracking-tight">No earnings trend available yet</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Complete bookings to unlock earnings analytics.
              </p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
              <BarChart data={earningsTrend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="chefEarningsBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="hsl(249 90% 68%)" stopOpacity="0.55" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.35} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  minTickGap={24}
                  className="text-xs"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => currencyTickFormatter(Number(value), totalEarningsCurrency)}
                  width={52}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                  content={
                    <ChartTooltipContent
                      className="rounded-2xl border-white/70 bg-white/90 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-950/90"
                      formatter={(value) => (
                        <span className="text-foreground font-medium">{formatCurrency(Number(value), totalEarningsCurrency)}</span>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="earnings"
                  fill="url(#chefEarningsBar)"
                  radius={[12, 12, 4, 4]}
                  maxBarSize={36}
                  animationDuration={900}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
