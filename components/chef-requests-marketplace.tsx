"use client"

import * as React from "react"
import { ArrowUpDown, Calendar, Filter, DollarSign, Search, Sparkles, Users } from "lucide-react"
import Link from "next/link"

import { ChefRequestRow } from "@/components/chef-request-table"
import { ChefRequestCard } from "@/components/dashboard/chef/chef-request-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/ui/dashboard-stat-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ChefRequestsMarketplaceProps = {
  requests: ChefRequestRow[]
}

export function ChefRequestsMarketplace({ requests }: ChefRequestsMarketplaceProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState("newest")
  const [showFilters, setShowFilters] = React.useState(false)

  // Filter and sort requests
  const filteredRequests = React.useMemo(() => {
    let filtered = requests

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((request) =>
        request.location.toLowerCase().includes(query) ||
        request.details?.toLowerCase().includes(query)
      )
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "budget-high":
          return b.budget - a.budget
        case "budget-low":
          return a.budget - b.budget
        case "newest":
        default:
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
      }
    })

    return sorted
  }, [requests, searchQuery, sortBy])

  const displayRequests = filteredRequests
  const upcomingRequestsCount = requests.filter((request) => new Date(request.eventDate) >= new Date()).length
  const highestBudget = requests.length ? `$${Math.max(...requests.map((request) => request.budget)).toLocaleString()}` : "$0"

  return (
    <div className="space-y-6 lg:space-y-7">
      <Card className="overflow-hidden rounded-[28px] border border-background/20 bg-background/95 shadow-xl shadow-black/5 backdrop-blur dark:border-background/10 dark:bg-background/90">
        <CardContent className="relative overflow-hidden p-0">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_40%)]" />
          <div className="relative flex flex-col gap-6 p-6 md:p-7 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit rounded-full border border-background/20 bg-background/70 px-3.5 py-1 text-xs font-medium shadow-sm backdrop-blur dark:border-background/10 dark:bg-background/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Live workspace
              </Badge>
              <div className="space-y-2">
                <h1 className="text-foreground text-3xl font-semibold tracking-tight lg:text-4xl">
                  Incoming Requests
                </h1>
                <p className="text-muted-foreground max-w-2xl text-sm leading-6 md:text-[15px]">
                  Review nearby demand, spot the best-fit opportunities, and send polished proposals from one premium workspace.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-primary shadow-sm">
                  <Users className="h-4 w-4" />
                  {requests.length} active opportunities
                </div>
                <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-white/70 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Sorted for fast proposal workflow
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:min-w-[420px] xl:max-w-[460px]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/60 bg-background/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Available</p>
                  <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">{requests.length}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Requests ready to review</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-background/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Upcoming</p>
                  <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">{upcomingRequestsCount}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Future events in range</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-background/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Top budget</p>
                  <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">{highestBudget}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Highest-value lead</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardStatCard
          label="Available requests"
          value={requests.length}
          description="Live opportunities currently available in your service area"
          icon={<Users className="h-5 w-5" />}
          trend={requests.length > 0 ? "Fresh demand is available to convert into bookings." : "No request matches are available right now."}
        />
        <DashboardStatCard
          label="Upcoming requests"
          value={upcomingRequestsCount}
          description="Future-dated events you can prioritize for planning"
          icon={<Calendar className="h-5 w-5" />}
          trend={upcomingRequestsCount > 0 ? "Upcoming requests give you more time to pitch strategically." : "No future-dated requests are available yet."}
        />
        <DashboardStatCard
          label="Highest budget"
          value={highestBudget}
          description="Top visible budget among the requests in your queue"
          icon={<DollarSign className="h-5 w-5" />}
          trend={requests.length > 0 ? "Higher-budget opportunities can lift overall revenue quality." : "Budget insight will appear once requests are available."}
        />
      </div>

      <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <div className="text-primary inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Search and sort
              </div>
              <CardTitle className="text-foreground text-xl font-semibold tracking-tight">Request controls</CardTitle>
              <p className="text-muted-foreground text-sm leading-6">
                Narrow your queue, surface priority opportunities, and move from review to proposal faster.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
            <div className="group relative w-full">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
              <Input
                placeholder="Search by location or request details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-muted/30 pl-10 shadow-sm transition-all duration-200 focus-visible:bg-background focus-visible:border-border focus-visible:shadow-md focus-visible:shadow-black/5"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-11 rounded-2xl border-white/70 bg-background/70 px-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-background dark:border-white/10 dark:bg-background/10 dark:hover:bg-background/15"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? "Filters active" : "Filters"}
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-11 w-full rounded-2xl border-white/70 bg-background/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10 lg:w-[220px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="budget-high">Budget: High to Low</SelectItem>
                <SelectItem value="budget-low">Budget: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showFilters ? (
            <div className="rounded-[26px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,248,255,0.9))] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
              <p className="text-foreground text-sm font-medium tracking-tight">Filter panel ready</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Search and sorting are active. This panel can host more premium filters as request discovery expands.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {displayRequests.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {displayRequests.map((request) => (
            <ChefRequestCard key={request.id} request={request} />
          ))}
        </div>
      ) : (
        <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
          <CardContent className="py-12">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
                <Search className="h-9 w-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground text-2xl font-semibold tracking-tight">No requests yet</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  Great opportunities are on the way. Keep your profile polished so you are ready to convert new demand as soon as it appears.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button className="h-11 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25" asChild>
                  <Link href="/dashboard/chef/profile">Update Profile</Link>
                </Button>
                <Button variant="outline" className="h-11 rounded-2xl border-white/70 bg-background/70 px-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-background dark:border-white/10 dark:bg-background/10 dark:hover:bg-background/15">
                  Expand Service Area
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
