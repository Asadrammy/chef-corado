import Link from "next/link"
import { ArrowRight, CheckCircle2, Sparkles, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ChefHeroProps {
  userName: string
  activeBookings: number
  availableRequests: number
  totalEarnings: number
}

export function ChefHero({ userName, activeBookings, availableRequests, totalEarnings }: ChefHeroProps) {
  const firstName = userName?.split(" ")[0] || "Chef"

  return (
    <Card className="overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] shadow-xl shadow-black/5 backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,39,0.96),rgba(24,24,34,0.94))]">
      <CardContent className="relative overflow-hidden p-0">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_40%)]" />
        <div className="relative flex flex-col gap-6 p-6 md:p-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-4">
            <Badge variant="secondary" className="w-fit rounded-full border border-white/60 bg-white/70 px-3.5 py-1 text-xs font-medium shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Chef Dashboard
            </Badge>
            <div className="space-y-2">
              <h1 className="text-foreground text-3xl font-semibold tracking-tight lg:text-4xl">
              Welcome back, {firstName}
              </h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-6 md:text-[15px]">
                Run your chef business from one clean workspace with bookings, nearby demand, and earnings performance surfaced above the fold.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-primary shadow-sm">
                <TrendingUp className="h-4 w-4" />
                Live operations overview
              </div>
              <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <span className="bg-emerald-500 h-2 w-2 rounded-full" />
                Dashboard synced with real activity
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:min-w-[450px] xl:max-w-[470px]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Active</p>
                <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">{activeBookings}</p>
                <p className="text-muted-foreground mt-1 text-xs">Bookings in motion</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Requests</p>
                <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">{availableRequests}</p>
                <p className="text-muted-foreground mt-1 text-xs">Nearby demand live now</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Revenue</p>
                <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">${totalEarnings.toLocaleString()}</p>
                <p className="text-muted-foreground mt-1 text-xs">Completed payouts</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:flex-row">
              <Button className="h-11 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25" asChild>
                <Link href="/dashboard/chef/requests">
                  Review Requests
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-white/70 bg-white/70 px-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                asChild
              >
                <Link href="/dashboard/chef/profile">
                  Update Profile
                  <CheckCircle2 className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
