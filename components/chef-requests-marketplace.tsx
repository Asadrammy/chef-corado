"use client"

import * as React from "react"
import { ArrowUpDown, Calendar, Filter, Search, Sparkles, Users, MapPin, SlidersHorizontal, Wallet } from "lucide-react"
import Link from "next/link"

import { ChefRequestRow } from "@/components/chef-request-table"
import { ChefRequestCard } from "@/components/dashboard/chef/chef-request-card"
import { MatchResult } from "@/lib/services/smart-matching-service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/ui/dashboard-stat-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { formatCurrency } from "@/lib/currency"

export type ChefRequestsMarketplaceProps = {
  requests: ChefRequestRow[]
  serviceRadiusKm?: number
  baseLocation?: string
  useSmartMatching?: boolean
}

export function ChefRequestsMarketplace({ requests, serviceRadiusKm, baseLocation, useSmartMatching = false }: ChefRequestsMarketplaceProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState("newest")
  const [showFilters, setShowFilters] = React.useState(false)
  const [smartMatches, setSmartMatches] = React.useState<MatchResult[]>([])
  const [isLoadingMatches, setIsLoadingMatches] = React.useState(false)
  const [radiusFilter, setRadiusFilter] = React.useState(serviceRadiusKm ?? 50)

  // Fetch smart matches when enabled
  React.useEffect(() => {
    if (!useSmartMatching) return

    const fetchSmartMatches = async () => {
      setIsLoadingMatches(true)
      try {
        const response = await fetch("/api/requests/matches?limit=50")
        if (response.ok) {
          const data = await response.json()
          setSmartMatches(data.matches || [])
        }
      } catch (error) {
        console.error("Failed to fetch smart matches:", error)
      } finally {
        setIsLoadingMatches(false)
      }
    }

    fetchSmartMatches()
  }, [useSmartMatching])

  // Filter and sort requests
  const filteredRequests = React.useMemo(() => {
    let filtered = requests

    // Radius filter
    filtered = filtered.filter((request) => (request.distanceKm ?? 0) <= radiusFilter)

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
        case "match-score":
          // Sort by match score if using smart matching
          if (useSmartMatching) {
            const matchA = smartMatches.find((m) => m.requestId === a.id)
            const matchB = smartMatches.find((m) => m.requestId === b.id)
            return (matchB?.matchScore || 0) - (matchA?.matchScore || 0)
          }
          return 0
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
  }, [requests, searchQuery, sortBy, smartMatches, useSmartMatching, radiusFilter])

  // Enrich requests with match data
  const displayRequests = React.useMemo(() => {
    if (!useSmartMatching) return filteredRequests

    return filteredRequests.map((req) => ({
      ...req,
      matchData: smartMatches.find((m) => m.requestId === req.id),
    }))
  }, [filteredRequests, smartMatches, useSmartMatching])
  const upcomingRequestsCount = requests.filter((request) => new Date(request.eventDate) >= new Date()).length
  const highestBudgetRequest = requests.reduce<ChefRequestRow | null>((highest, request) => {
    if (!highest || request.budget > highest.budget) {
      return request
    }
    return highest
  }, null)
  const highestBudget = highestBudgetRequest
    ? formatCurrency(highestBudgetRequest.budget, highestBudgetRequest.currency || "GBP")
    : formatCurrency(0, "GBP")
  const activeServiceRadius = serviceRadiusKm ?? 50

  return (
    <div className="space-y-6 lg:space-y-7">
      <Card className="overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(244,247,255,0.92))] shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(17,24,39,0.98),rgba(24,24,34,0.96))]">
        <CardContent className="relative overflow-hidden p-0">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_40%)]" />
          <div className="relative flex flex-col gap-6 p-6 md:p-7 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit rounded-full border border-white/60 bg-white/75 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Live workspace
              </Badge>
              <div className="space-y-2">
                <h1 className="text-foreground text-4xl font-semibold tracking-tight lg:text-5xl">
                  Incoming Requests
                </h1>
                <p className="text-muted-foreground max-w-2xl text-sm leading-6 md:text-[15px]">
                  Showing open customer requests within your saved service radius so you can review nearby demand and send polished proposals.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-primary shadow-sm">
                  <Users className="h-4 w-4" />
                  {requests.length} active opportunities
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <MapPin className="h-4 w-4 text-primary" />
                  Saved service radius: {activeServiceRadius} km{baseLocation ? ` from ${baseLocation}` : ""}
                </div>
                <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-white/70 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Sorted for fast proposal workflow
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:min-w-[470px] xl:max-w-[520px]">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-[26px] border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Available</p>
                  <p className="text-foreground mt-2 text-3xl font-semibold tracking-tight">{requests.length}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Requests ready to review</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-background/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Upcoming</p>
                  <p className="text-foreground mt-2 text-3xl font-semibold tracking-tight">{upcomingRequestsCount}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Future events in range</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-background/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Top budget</p>
                  <p className="text-foreground mt-2 text-3xl font-semibold tracking-tight">{highestBudget}</p>
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
          icon={<Wallet className="h-5 w-5" />}
          trend={requests.length > 0 ? "Higher-budget opportunities can lift overall revenue quality." : "Budget insight will appear once requests are available."}
        />
      </div>

      <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Service radius summary</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing open customer requests within your saved service radius: <span className="font-semibold text-foreground">{activeServiceRadius} km</span>
              {baseLocation ? ` from ${baseLocation}` : " from your saved base location"}
            </p>
            <p className="text-xs text-muted-foreground">
              The slider below narrows this page temporarily to <span className="font-medium text-foreground">{radiusFilter} km</span>. It does not change your saved matching radius.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Slider
                value={[radiusFilter]}
                onValueChange={(value) => setRadiusFilter(value[0])}
                max={serviceRadiusKm ? Math.max(serviceRadiusKm, 100) : 100}
                min={5}
                step={5}
                className="flex-1 max-w-xs"
              />
              <span className="text-sm font-medium text-foreground w-12">{radiusFilter} km</span>
            </div>
          </div>
          <Button variant="outline" className="rounded-2xl shrink-0" asChild>
            <Link href="/dashboard/chef/profile">Edit Service Radius</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <div className="text-primary inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] shadow-sm">
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
                className="h-12 rounded-2xl border-white/70 bg-white/80 pl-10 shadow-sm backdrop-blur transition-all duration-200 focus-visible:bg-white focus-visible:border-white focus-visible:shadow-md focus-visible:shadow-black/5 dark:border-white/10 dark:bg-white/5"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 rounded-2xl border-white/70 bg-white/80 px-4 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? "Filters active" : "Filters"}
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-12 w-full rounded-2xl border-white/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 lg:w-[220px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {useSmartMatching && (
                  <SelectItem value="match-score">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Best Match (AI)
                    </span>
                  </SelectItem>
                )}
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="budget-high">Budget: High to Low</SelectItem>
                <SelectItem value="budget-low">Budget: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showFilters ? (
            <div className="rounded-[26px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,248,255,0.92))] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
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
        <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <CardContent className="py-12">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
                <Search className="h-9 w-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground text-2xl font-semibold tracking-tight">No requests yet</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  No requests match your current radius right now. Expanding your service area or confirming your base location can unlock more marketplace demand.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button className="h-11 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25" asChild>
                  <Link href="/dashboard/chef/profile">Update Profile</Link>
                </Button>
                <Button variant="outline" className="h-11 rounded-2xl border-white/70 bg-background/70 px-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-background dark:border-white/10 dark:bg-background/10 dark:hover:bg-background/15" asChild>
                  <Link href="/dashboard/chef/profile">Expand Service Area</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
