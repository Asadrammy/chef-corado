"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowUpDown,
  Calendar,
  ChefHat,
  Filter,
  MapPin,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  Clock3,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import { ChefRequestCard } from "@/components/dashboard/chef/chef-request-card"
import { ChefRequestSortKey } from "@/lib/chef-request-marketplace"
import {
  getMarketplaceActiveFilterCount,
  parseMarketplaceFilters,
} from "@/lib/chef-request-marketplace-filters"
import type { ChefRequestView, ChefRespondedRequestView } from "@/lib/chef-request-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/ui/dashboard-stat-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { formatCurrency } from "@/lib/currency"
type MarketplacePagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ChefRequestsMarketplaceProps = {
  requests: ChefRequestView[]
  respondedRequests: ChefRespondedRequestView[]
  totalRequestsCount: number
  totalRespondedCount: number
  pagination: MarketplacePagination
  serviceRadiusKm?: number
  baseLocation?: string
  useSmartMatching?: boolean
}

function matchesCurrentFilterValues(filters: ReturnType<typeof parseMarketplaceFilters>) {
  return getMarketplaceActiveFilterCount(filters)
}

function RespondedCard({ request }: { request: ChefRespondedRequestView }) {
  const proposalDateLabel = request.proposal.sentDateLabel ?? "Date pending"
  const proposalAgeLabel = request.proposal.sentAgeLabel ?? "Recently"
  const followUpHref = request.followUpHref ?? request.detailHref
  const guestCount = request.actualAttendeeCount ?? request.guestCount

  return (
    <Card className="rounded-[24px] border border-background/40 bg-background/95 shadow-lg shadow-black/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 dark:border-background/20">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Badge variant="secondary" className="w-fit rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-sm">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Responded
            </Badge>
            <div className="min-w-0 space-y-1">
              <h3 className="text-foreground text-xl font-semibold tracking-tight line-clamp-1">{request.title}</h3>
              <p className="text-muted-foreground text-sm leading-6 line-clamp-2">{request.details || "Proposal sent to this request."}</p>
              <p className="text-xs font-medium text-muted-foreground">Hello {request.clientGreetingName}</p>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full border-border/60 bg-background/60 px-2.5 py-1 text-xs">
            {request.proposal.statusLabel}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{request.location}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
            <Calendar className="h-4 w-4" />
            {request.submittedDateLabel ?? "Date pending"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
            <Clock3 className="h-4 w-4" />
            {proposalAgeLabel}
          </span>
          {guestCount != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-muted/70 px-2.5 py-1">
              <Users className="h-4 w-4" />
              {guestCount} guests
            </span>
          ) : null}
          <Badge variant="outline" className="rounded-full border-border/60 bg-background/60 px-2.5 py-1">
            {request.eventType ?? "Event"}
          </Badge>
          <Badge variant="outline" className="rounded-full border-border/60 bg-background/60 px-2.5 py-1">
            {request.serviceTypeLabel}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">Proposal</p>
            <p className="text-foreground mt-2 text-xl font-semibold tracking-tight">
              {formatCurrency(request.proposal.price, request.proposal.currency || request.currency || "GBP")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">Sent</p>
            <p className="text-foreground mt-2 text-sm font-medium">{proposalDateLabel}</p>
            <p className="text-muted-foreground text-xs">{request.proposal.sentAgeLabel ?? "Recently"}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline" className="rounded-full border-border/60 bg-background/60 px-2.5 py-1">
            {request.proposal.statusLabel}
          </Badge>
          {request.cuisinePreferences.length ? (
            <Badge variant="outline" className="rounded-full border-border/60 bg-background/60 px-2.5 py-1">
              <ChefHat className="mr-1.5 h-3.5 w-3.5" />
              {request.cuisinePreferences.slice(0, 2).join(", ")}
            </Badge>
          ) : null}
          {request.perPersonBudget != null ? (
            <Badge variant="outline" className="rounded-full border-border/60 bg-background/60 px-2.5 py-1">
              {formatCurrency(request.perPersonBudget, request.currency || "GBP")} pp
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium text-foreground">{request.totalProposalCount ?? 0}/10 chefs responded</p>
            <p className="text-muted-foreground">Follow up safely through the platform conversation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-2xl border-white/70 bg-white/70 shadow-sm backdrop-blur" asChild>
              <Link href={request.detailHref}>View request</Link>
            </Button>
            <Button className="brand-gradient-button rounded-2xl px-4 shadow-lg shadow-primary/20" asChild>
              <Link href={followUpHref}>Message client</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function makeQueryUpdater(pathname: string, searchParams: URLSearchParams, replace: (url: string, options?: { scroll?: boolean }) => void) {
  return (patch: Record<string, string | number | null | undefined>, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key)
      else params.set(key, String(value))
    }
    if (resetPage) {
      params.set("page", "1")
    }
    replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false })
  }
}

function getMapBounds(requests: ChefRequestView[], filters: ReturnType<typeof parseMarketplaceFilters>) {
  if (filters.mapNorth != null && filters.mapSouth != null && filters.mapEast != null && filters.mapWest != null) {
    return {
      north: filters.mapNorth,
      south: filters.mapSouth,
      east: filters.mapEast,
      west: filters.mapWest,
    }
  }

  const located = requests.filter((request) => request.latitude != null && request.longitude != null)
  if (!located.length) {
    return { north: 56, south: 49, east: 2, west: -8 }
  }

  const latitudes = located.map((request) => request.latitude as number)
  const longitudes = located.map((request) => request.longitude as number)
  const north = Math.max(...latitudes)
  const south = Math.min(...latitudes)
  const east = Math.max(...longitudes)
  const west = Math.min(...longitudes)
  const latPad = Math.max((north - south) * 0.2, 0.05)
  const lngPad = Math.max((east - west) * 0.2, 0.05)
  return {
    north: Math.min(90, north + latPad),
    south: Math.max(-90, south - latPad),
    east: Math.min(180, east + lngPad),
    west: Math.max(-180, west - lngPad),
  }
}

function RequestAreaMap({
  requests,
  filters,
  onSearchBounds,
}: {
  requests: ChefRequestView[]
  filters: ReturnType<typeof parseMarketplaceFilters>
  onSearchBounds: (bounds: { north: number; south: number; east: number; west: number }) => void
}) {
  const [bounds, setBounds] = React.useState(() => getMapBounds(requests, filters))

  React.useEffect(() => {
    setBounds(getMapBounds(requests, filters))
  }, [requests, filters])

  const latSpan = Math.max(bounds.north - bounds.south, 0.01)
  const lngSpan = Math.max(bounds.east - bounds.west, 0.01)
  const locatedRequests = requests.filter((request) =>
    request.latitude != null &&
    request.longitude != null &&
    request.latitude <= bounds.north &&
    request.latitude >= bounds.south &&
    request.longitude <= bounds.east &&
    request.longitude >= bounds.west
  )

  const shift = (latFactor: number, lngFactor: number) => {
    const latDelta = latSpan * latFactor
    const lngDelta = lngSpan * lngFactor
    setBounds((current) => ({
      north: Math.min(90, current.north + latDelta),
      south: Math.max(-90, current.south + latDelta),
      east: Math.min(180, current.east + lngDelta),
      west: Math.max(-180, current.west + lngDelta),
    }))
  }

  const zoom = (factor: number) => {
    const centerLat = (bounds.north + bounds.south) / 2
    const centerLng = (bounds.east + bounds.west) / 2
    const nextLatSpan = Math.max(latSpan * factor, 0.01)
    const nextLngSpan = Math.max(lngSpan * factor, 0.01)
    setBounds({
      north: Math.min(90, centerLat + nextLatSpan / 2),
      south: Math.max(-90, centerLat - nextLatSpan / 2),
      east: Math.min(180, centerLng + nextLngSpan / 2),
      west: Math.max(-180, centerLng - nextLngSpan / 2),
    })
  }

  return (
    <Card className="rounded-[28px] border border-white/60 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Map search</p>
            <p className="text-xs text-muted-foreground">{locatedRequests.length} request markers in the current viewport</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="icon" variant="outline" className="rounded-xl" onClick={() => zoom(0.65)} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" className="rounded-xl" onClick={() => zoom(1.35)} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" className="rounded-xl" onClick={() => shift(0.35, 0)} aria-label="Pan north"><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" className="rounded-xl" onClick={() => shift(-0.35, 0)} aria-label="Pan south"><ArrowDown className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" className="rounded-xl" onClick={() => shift(0, -0.35)} aria-label="Pan west"><ArrowLeft className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" className="rounded-xl" onClick={() => shift(0, 0.35)} aria-label="Pan east"><ArrowRight className="h-4 w-4" /></Button>
            <Button className="rounded-xl" onClick={() => onSearchBounds(bounds)}>Search This Area</Button>
          </div>
        </div>
        <div className="relative h-72 overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] dark:bg-[linear-gradient(135deg,#101827,#182235)]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
          {locatedRequests.map((request) => {
            const left = (((request.longitude as number) - bounds.west) / lngSpan) * 100
            const top = ((bounds.north - (request.latitude as number)) / latSpan) * 100
            return (
              <Link
                key={request.id}
                href={`/dashboard/chef/requests/${request.id}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg ring-4 ring-white/70"
                style={{ left: `${left}%`, top: `${top}%` }}
                aria-label={`Open request ${request.title}`}
              >
                <MapPin className="h-4 w-4" />
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function ChefRequestsMarketplace({
  requests,
  respondedRequests,
  totalRequestsCount,
  totalRespondedCount,
  pagination,
  serviceRadiusKm,
  baseLocation,
  useSmartMatching = false,
}: ChefRequestsMarketplaceProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentSearchParams = React.useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams])
  const currentFilters = React.useMemo(
    () => parseMarketplaceFilters(Object.fromEntries(currentSearchParams.entries())),
    [currentSearchParams]
  )
  const [showFilters, setShowFilters] = React.useState(Boolean(currentFilters.search || currentFilters.budgetMin != null || currentFilters.budgetMax != null || currentFilters.perPersonMin != null || currentFilters.perPersonMax != null || currentFilters.guestsMin != null || currentFilters.guestsMax != null || currentFilters.dateFrom || currentFilters.dateTo || currentFilters.radiusKm != null || currentFilters.earlyAccessOnly || currentFilters.directOnly || currentFilters.beFirstOnly || currentFilters.urgentOnly || currentFilters.lastMinuteOnly || currentFilters.highIntentOnly))
  const [radiusDraft, setRadiusDraft] = React.useState(currentFilters.radiusKm ?? serviceRadiusKm ?? 50)

  React.useEffect(() => {
    setRadiusDraft(currentFilters.radiusKm ?? serviceRadiusKm ?? 50)
  }, [currentFilters.radiusKm, serviceRadiusKm])

  const updateQuery = React.useMemo(
    () => makeQueryUpdater(pathname, currentSearchParams, router.replace),
    [pathname, router, currentSearchParams]
  )

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (radiusDraft !== (currentFilters.radiusKm ?? serviceRadiusKm ?? 50)) {
        updateQuery({ radius: radiusDraft })
      }
    }, 180)

    return () => window.clearTimeout(timeout)
  }, [radiusDraft, currentFilters.radiusKm, serviceRadiusKm, updateQuery])

  const activeFilterCount = matchesCurrentFilterValues(currentFilters)
  const currentTab = currentFilters.tab
  const totalPages = pagination.totalPages
  const currentPage = pagination.page

  const highestBudgetRequest = requests.reduce<ChefRequestView | null>((highest, request) => {
    if (!highest || request.budget > highest.budget) return request
    return highest
  }, null)

  const highestBudget = highestBudgetRequest
    ? formatCurrency(highestBudgetRequest.budget, highestBudgetRequest.currency || "GBP")
    : formatCurrency(0, "GBP")

  const upcomingRequestsCount = requests.filter((request) => new Date(request.eventDate) >= new Date()).length

  const controls = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <div className="group relative w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
          <Input
            value={currentFilters.search}
            placeholder="Search title, location, city, postcode, cuisine or service..."
            onChange={(e) => updateQuery({ search: e.target.value || null })}
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
          {activeFilterCount > 0 ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{activeFilterCount}</span> : null}
        </Button>
        <Select value={currentFilters.sort} onValueChange={(value) => updateQuery({ sort: value as ChefRequestSortKey })}>
          <SelectTrigger className="h-12 w-full rounded-2xl border-white/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 lg:w-[220px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {useSmartMatching ? (
              <SelectItem value="match-score">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Best Match (AI)
                </span>
              </SelectItem>
            ) : null}
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="event-date">Event Date</SelectItem>
            <SelectItem value="closest">Closest to Me</SelectItem>
            <SelectItem value="urgent">Urgent First</SelectItem>
            <SelectItem value="high-intent">High Intent First</SelectItem>
            <SelectItem value="budget-high">Budget: High to Low</SelectItem>
            <SelectItem value="budget-low">Budget: Low to High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showFilters ? (
        <div className="rounded-[26px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,248,255,0.92))] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-foreground text-sm font-medium tracking-tight">Filter requests</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Tune budget, guests, dates and radius. Results stay on the server and the URL keeps state on refresh.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                router.replace(pathname, { scroll: false })
              }}
            >
              Reset filters
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Total budget</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="0" placeholder="Min" value={currentFilters.budgetMin ?? ""} onChange={(e) => updateQuery({ budgetMin: e.target.value || null })} className="rounded-2xl" />
                <Input type="number" min="0" placeholder="Max" value={currentFilters.budgetMax ?? ""} onChange={(e) => updateQuery({ budgetMax: e.target.value || null })} className="rounded-2xl" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Per-person budget</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="0" placeholder="Min" value={currentFilters.perPersonMin ?? ""} onChange={(e) => updateQuery({ ppMin: e.target.value || null })} className="rounded-2xl" />
                <Input type="number" min="0" placeholder="Max" value={currentFilters.perPersonMax ?? ""} onChange={(e) => updateQuery({ ppMax: e.target.value || null })} className="rounded-2xl" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Guests</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="0" placeholder="Min" value={currentFilters.guestsMin ?? ""} onChange={(e) => updateQuery({ guestsMin: e.target.value || null })} className="rounded-2xl" />
                <Input type="number" min="0" placeholder="Max" value={currentFilters.guestsMax ?? ""} onChange={(e) => updateQuery({ guestsMax: e.target.value || null })} className="rounded-2xl" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Event date</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={currentFilters.dateFrom ?? ""} onChange={(e) => updateQuery({ dateFrom: e.target.value || null })} className="rounded-2xl" />
                <Input type="date" value={currentFilters.dateTo ?? ""} onChange={(e) => updateQuery({ dateTo: e.target.value || null })} className="rounded-2xl" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Radius</p>
                <p className="text-sm text-muted-foreground">{radiusDraft} km</p>
              </div>
              <Slider
                value={[radiusDraft]}
                min={5}
                max={serviceRadiusKm ?? 100}
                step={5}
                onValueChange={(value) => setRadiusDraft(value[0])}
                className="flex-1"
              />
              <p className="text-xs text-muted-foreground">
                Saved radius caps eligibility at {serviceRadiusKm ?? 0} km{baseLocation ? ` from ${baseLocation}` : ""}.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <p className="text-sm font-medium text-foreground">Spotlight</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={currentFilters.earlyAccessOnly ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => updateQuery({ earlyAccess: currentFilters.earlyAccessOnly ? null : "1" })}
                >
                  Early Access
                </Button>
                <Button
                  type="button"
                  variant={currentFilters.directOnly ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => updateQuery({ direct: currentFilters.directOnly ? null : "1" })}
                >
                  Direct Requests
                </Button>
                <Button
                  type="button"
                  variant={currentFilters.beFirstOnly ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => updateQuery({ beFirst: currentFilters.beFirstOnly ? null : "1" })}
                >
                  Be First to Respond
                </Button>
                <Button
                  type="button"
                  variant={currentFilters.urgentOnly ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => updateQuery({ urgent: currentFilters.urgentOnly ? null : "1" })}
                >
                  Urgent
                </Button>
                <Button
                  type="button"
                  variant={currentFilters.lastMinuteOnly ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => updateQuery({ lastMinute: currentFilters.lastMinuteOnly ? null : "1" })}
                >
                  24-72h
                </Button>
                <Button
                  type="button"
                  variant={currentFilters.highIntentOnly ? "default" : "outline"}
                  className="rounded-2xl"
                  onClick={() => updateQuery({ highIntent: currentFilters.highIntentOnly ? null : "1" })}
                >
                  High Intent
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )

  const paginationControls = totalPages > 1 ? (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (currentPage > 1) updateQuery({ page: currentPage - 1 }, false)
            }}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="px-3 py-2 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (currentPage < totalPages) updateQuery({ page: currentPage + 1 }, false)
            }}
            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ) : null

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
                <h1 className="text-foreground text-4xl font-semibold tracking-tight lg:text-5xl">Incoming Requests</h1>
                <p className="text-muted-foreground max-w-2xl text-sm leading-6 md:text-[15px]">
                  Showing requests within your saved service radius. Narrow the queue by budget, guests, date, or search.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-primary shadow-sm">
                  <Users className="h-4 w-4" />
                  {totalRequestsCount} active opportunities
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <MapPin className="h-4 w-4 text-primary" />
                  Saved service radius: {serviceRadiusKm ?? 0} km{baseLocation ? ` from ${baseLocation}` : ""}
                </div>
                <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-white/70 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Sorted for fast proposal workflow
                </div>
              </div>
            </div>
          </div>
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
                Filter the live marketplace without leaking contact details or breaking the marketplace radius rules.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={currentTab} onValueChange={(value) => updateQuery({ tab: value, page: 1 }, false)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1">
              <TabsTrigger value="requests" className="rounded-xl">
                Requests <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{totalRequestsCount}</span>
              </TabsTrigger>
              <TabsTrigger value="responded" className="rounded-xl">
                Responded <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{totalRespondedCount}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-4 space-y-4">
              {controls}
              <RequestAreaMap
                requests={requests}
                filters={currentFilters}
                onSearchBounds={(bounds) => updateQuery({
                  north: bounds.north.toFixed(6),
                  south: bounds.south.toFixed(6),
                  east: bounds.east.toFixed(6),
                  west: bounds.west.toFixed(6),
                })}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <DashboardStatCard
                  label="Available requests"
                  value={totalRequestsCount}
                  description="Live opportunities matching your current filters"
                  icon={<Users className="h-5 w-5" />}
                  trend={totalRequestsCount > 0 ? "Fresh demand is available to convert into bookings." : "No request matches are available right now."}
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
                  trend={totalRequestsCount > 0 ? "Higher-budget opportunities can lift overall revenue quality." : "Budget insight will appear once requests are available."}
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
                      Saved service radius caps eligibility at <span className="font-semibold text-foreground">{serviceRadiusKm ?? 0} km</span>
                      {baseLocation ? ` from ${baseLocation}` : " from your saved base location"}.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The radius control narrows visibility below that maximum. Missing coordinates are never treated as zero distance.
                    </p>
                  </div>
                  <Button variant="outline" className="rounded-2xl shrink-0" asChild>
                    <Link href="/dashboard/chef/profile">Edit Service Radius</Link>
                  </Button>
                </CardContent>
              </Card>

              {requests.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {requests.map((request) => (
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
                          No requests match your current filters. Adjust radius, dates, guests, or budget to widen the queue.
                        </p>
                      </div>
                      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Button className="brand-gradient-button h-11 rounded-2xl px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25" asChild>
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
              {paginationControls}
            </TabsContent>

            <TabsContent value="responded" className="mt-4 space-y-4">
              {controls}
              <div className="rounded-[26px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,248,255,0.92))] p-4 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))]">
                <p className="text-foreground text-sm font-medium tracking-tight">Sent proposals</p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  Requests where you have already responded stay visible here, including proposals that are still awaiting the client decision.
                </p>
              </div>

              {respondedRequests.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {respondedRequests.map((request) => (
                    <RespondedCard key={request.proposal.id} request={request} />
                  ))}
                </div>
              ) : (
                <Card className="rounded-[30px] border border-white/60 bg-white/72 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                  <CardContent className="py-12">
                    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                      <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
                        <MessageSquare className="h-9 w-9" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-foreground text-2xl font-semibold tracking-tight">No responded requests yet</h3>
                        <p className="text-muted-foreground text-sm leading-6">
                          Once you send a proposal, the request will appear here for safe follow-up and proposal tracking.
                        </p>
                      </div>
                      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Button className="brand-gradient-button h-11 rounded-2xl px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25" asChild>
                          <Link href="/dashboard/chef/requests">Browse requests</Link>
                        </Button>
                        <Button variant="outline" className="h-11 rounded-2xl border-white/70 bg-background/70 px-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-background dark:border-white/10 dark:bg-background/10 dark:hover:bg-background/15" asChild>
                          <Link href="/dashboard/chef/messages">Open messages</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {paginationControls}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
