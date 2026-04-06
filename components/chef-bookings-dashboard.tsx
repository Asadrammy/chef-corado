"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarDays, CheckCircle2, DollarSign, Search, Sparkles, Users } from "lucide-react"

import { ChefBookingCard, type ChefBookingPayload } from "@/components/dashboard/chef/chef-booking-card"
import { ChefBookingsControlPanel } from "@/components/dashboard/chef/chef-bookings-control-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DashboardStatCard } from "@/components/ui/dashboard-stat-card"

export function ChefBookingsDashboard() {
  const [bookings, setBookings] = React.useState<ChefBookingPayload[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState("newest")

  React.useEffect(() => {
    let isMounted = true

    const loadBookings = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/bookings", {
          cache: "no-store",
          credentials: "include",
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || "Unable to load bookings")
        }

        const payload: { bookings: ChefBookingPayload[] } = await response.json()
        if (isMounted) {
          setBookings(payload.bookings ?? [])
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load bookings")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadBookings()

    return () => {
      isMounted = false
    }
  }, [])

  // Filter and sort bookings
  const filteredBookings = React.useMemo(() => {
    let filtered = bookings

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(booking => 
        booking.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.proposal?.request?.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.proposal?.request?.details?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === statusFilter.toUpperCase())
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-high":
          return Number(b.totalPrice) - Number(a.totalPrice)
        case "price-low":
          return Number(a.totalPrice) - Number(b.totalPrice)
        case "newest":
        default:
          // Use eventDate from booking or from proposal.request, fallback to createdAt
          const dateA = a.eventDate || a.proposal?.request?.eventDate || a.createdAt
          const dateB = b.eventDate || b.proposal?.request?.eventDate || b.createdAt
          return new Date(dateB).getTime() - new Date(dateA).getTime()
      }
    })

    return sorted
  }, [bookings, searchQuery, statusFilter, sortBy])

  if (loading) {
    return (
      <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
        <CardContent className="py-16">
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-b-primary" />
              <p className="text-foreground text-base font-medium tracking-tight">Loading bookings...</p>
              <p className="text-muted-foreground mt-2 text-sm">Preparing your booking workspace and live event data.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
        <CardContent className="py-16">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="from-destructive/15 to-background text-destructive mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
              <Search className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h3 className="text-foreground text-2xl font-semibold tracking-tight">Unable to load bookings</h3>
              <p className="text-muted-foreground text-sm leading-6">{error}</p>
              <p className="text-muted-foreground text-sm leading-6">Please try refreshing the page or checking your connection.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalBookings = bookings.length
  const upcomingEvents = bookings.filter((booking) => booking.status === "PENDING" || booking.status === "CONFIRMED").length
  const completedEvents = bookings.filter((booking) => booking.status === "COMPLETED").length
  const totalEarnings = bookings
    .filter((booking) => booking.status === "COMPLETED")
    .reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0)

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[28px] border border-background/20 bg-background/95 shadow-xl shadow-black/5 backdrop-blur dark:border-background/10 dark:bg-background/90">
        <CardContent className="relative overflow-hidden p-0">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_40%)]" />
          <div className="relative flex flex-col gap-6 p-6 md:p-7 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit rounded-full border border-background/20 bg-background/70 px-3.5 py-1 text-xs font-medium shadow-sm backdrop-blur dark:border-background/10 dark:bg-background/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Active workspace
              </Badge>
              <div className="space-y-2">
                <h1 className="text-foreground text-3xl font-semibold tracking-tight lg:text-4xl">Bookings</h1>
                <p className="text-muted-foreground max-w-2xl text-sm leading-6 md:text-[15px]">
                  Manage confirmed work, keep upcoming events organized, and stay close to client communication from one premium operations view.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-primary shadow-sm">
                  <CalendarDays className="h-4 w-4" />
                  {upcomingEvents} live events in motion
                </div>
                <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-white/70 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Confirmed work synced in real time
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:min-w-[420px] xl:max-w-[460px]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/60 bg-background/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Total</p>
                  <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">{totalBookings}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Confirmed bookings tracked</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-background/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Upcoming</p>
                  <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">{upcomingEvents}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Events needing attention</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-background/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-background/10">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">Revenue</p>
                  <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">${totalEarnings.toLocaleString()}</p>
                  <p className="text-muted-foreground mt-1 text-xs">Completed booking value</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Total bookings"
          value={totalBookings}
          description="All accepted and confirmed bookings in your workspace"
          icon={<Users className="h-5 w-5" />}
          trend={totalBookings > 0 ? "Your confirmed workload is active and visible here." : "Accepted proposals will appear here once booked."}
        />
        <DashboardStatCard
          label="Upcoming events"
          value={upcomingEvents}
          description="Pending and confirmed bookings that still need execution"
          icon={<CalendarDays className="h-5 w-5" />}
          trend={upcomingEvents > 0 ? "Upcoming events should stay organized and client-ready." : "No upcoming events are scheduled right now."}
        />
        <DashboardStatCard
          label="Completed events"
          value={completedEvents}
          description="Bookings marked complete and delivered successfully"
          icon={<CheckCircle2 className="h-5 w-5" />}
          trend={completedEvents > 0 ? "Completed work strengthens trust and repeat business." : "Completed event insights will appear here over time."}
        />
        <DashboardStatCard
          label="Earnings"
          value={`$${totalEarnings.toLocaleString()}`}
          description="Revenue represented by completed booking totals"
          icon={<DollarSign className="h-5 w-5" />}
          trend={totalEarnings > 0 ? "Completed bookings are translating into visible revenue." : "Complete bookings to unlock revenue momentum."}
        />
      </div>

      <ChefBookingsControlPanel
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {filteredBookings.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredBookings.map((booking) => (
            <ChefBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        <Card className="rounded-[28px] border border-white/60 bg-card/95 shadow-xl shadow-black/5 backdrop-blur dark:border-white/10">
          <CardContent className="py-12">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="from-primary/15 to-background text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-sm">
                <CalendarDays className="h-9 w-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-foreground text-2xl font-semibold tracking-tight">No bookings yet</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  Confirmed bookings will appear here once a client accepts your proposal. Use this workspace to monitor upcoming service, completed events, and revenue as activity grows.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button className="h-11 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-5 shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25" asChild>
                  <Link href="/dashboard/chef/requests">Browse Requests</Link>
                </Button>
                <Button variant="outline" className="h-11 rounded-2xl border-white/70 bg-background/70 px-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-background dark:border-white/10 dark:bg-background/10 dark:hover:bg-background/15" asChild>
                  <Link href="/dashboard/chef/profile">Update Profile</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
