"use client"

import * as React from "react"
import Link from "next/link"
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  MapPin,
  MessageSquare,
  Search,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { analytics } from "@/lib/analytics"

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"

type BookingPayload = {
  id: string
  totalPrice: string
  status: BookingStatus
  createdAt: string
  chef: {
    user: {
      id: string
      name: string | null
    }
  }
  proposal: {
    request: {
      title?: string | null
      eventDate: string
      location: string
    }
  } | null
}

type FilterOption = "ALL" | "UPCOMING" | "COMPLETED" | "CANCELLED"
type SortOption = "NEWEST" | "EVENT_DATE" | "PRICE"

const bookingStatusMeta: Record<
  BookingStatus,
  { label: string; className: string; isUpcoming: boolean }
> = {
  PENDING: {
    label: "Upcoming",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    isUpcoming: true,
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    isUpcoming: true,
  },
  COMPLETED: {
    label: "Completed",
    className: "border-slate-300 bg-slate-100 text-slate-700",
    isUpcoming: false,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    isUpcoming: false,
  },
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const formatPrice = (value: string) => {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return value
  }
  return `$${parsed.toFixed(2)}`
}

const toPriceNumber = (value: string) => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function ClientBookingsList() {
  const [bookings, setBookings] = React.useState<BookingPayload[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<FilterOption>("ALL")
  const [sortBy, setSortBy] = React.useState<SortOption>("NEWEST")
  const [cancelLoading, setCancelLoading] = React.useState<Record<string, boolean>>({})

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

        const payload: { bookings: BookingPayload[] } = await response.json()
        if (isMounted) {
          setBookings(payload.bookings ?? [])
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Something went wrong")
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

  const filteredBookings = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return [...bookings]
      .filter((booking) => {
        if (statusFilter === "UPCOMING") {
          return booking.status === "PENDING" || booking.status === "CONFIRMED"
        }

        if (statusFilter !== "ALL") {
          return booking.status === statusFilter
        }

        return true
      })
      .filter((booking) => {
        if (!query) {
          return true
        }

        const chefName = (booking.chef?.user?.name ?? "").toLowerCase()
        const eventType = (booking.proposal?.request?.title ?? "").toLowerCase()
        const location = (booking.proposal?.request?.location ?? "").toLowerCase()

        return chefName.includes(query) || eventType.includes(query) || location.includes(query)
      })
      .sort((a, b) => {
        if (sortBy === "PRICE") {
          return toPriceNumber(b.totalPrice) - toPriceNumber(a.totalPrice)
        }

        if (sortBy === "EVENT_DATE") {
          const aDate = new Date(a.proposal?.request?.eventDate ?? a.createdAt).getTime()
          const bDate = new Date(b.proposal?.request?.eventDate ?? b.createdAt).getTime()
          return aDate - bDate
        }

        const aCreated = new Date(a.createdAt).getTime()
        const bCreated = new Date(b.createdAt).getTime()
        return bCreated - aCreated
      })
  }, [bookings, searchQuery, statusFilter, sortBy])

  const upcomingCount = bookings.filter((booking) => bookingStatusMeta[booking.status].isUpcoming).length
  const completedCount = bookings.filter((booking) => booking.status === "COMPLETED").length
  const pendingCount = bookings.filter((booking) => booking.status === "PENDING").length
  const totalSpent = bookings
    .filter((booking) => booking.status === "COMPLETED")
    .reduce((sum, booking) => sum + toPriceNumber(booking.totalPrice), 0)

  const handleCancelBooking = async (bookingId: string) => {
    setCancelLoading((prev) => ({ ...prev, [bookingId]: true }))

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Cancelled by client from bookings dashboard",
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Unable to cancel booking")
      }

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: "CANCELLED" } : booking
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel booking")
    } finally {
      setCancelLoading((prev) => ({ ...prev, [bookingId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300/80 bg-white/80 px-6 py-12">
        <Spinner className="text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">Loading bookings…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-sm font-medium text-slate-600">Upcoming Bookings</p>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Clock3 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{upcomingCount}</p>
          <p className="mt-1 text-xs text-slate-500">Including pending and confirmed events</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-sm font-medium text-slate-600">Completed Events</p>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{completedCount}</p>
          <p className="mt-1 text-xs text-slate-500">Successfully delivered experiences</p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50 p-5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-sm font-medium text-slate-600">Total Spent</p>
            <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{formatPrice(String(totalSpent))}</p>
          <p className="mt-1 text-xs text-slate-500">From completed bookings</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-sm font-medium text-slate-600">Pending Bookings</p>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{pendingCount}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting final confirmation</p>
        </div>
      </section>

      <section className="sticky top-3 z-10 flex flex-col gap-3 rounded-full border border-white/70 bg-white/80 px-4 py-3 shadow-md backdrop-blur lg:flex-row lg:items-center lg:gap-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search bookings..."
            className="h-10 rounded-full border-slate-200/80 bg-white pl-10 shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FilterOption)}>
            <SelectTrigger className="h-10 w-[170px] rounded-full border-slate-200/80 bg-white shadow-sm">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="h-10 w-[160px] rounded-full border-slate-200/80 bg-white shadow-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEWEST">Newest</SelectItem>
              <SelectItem value="EVENT_DATE">Event Date</SelectItem>
              <SelectItem value="PRICE">Price</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {!bookings.length ? (
        <section className="grid gap-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm lg:grid-cols-2 lg:p-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Getting started
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                No bookings yet — let’s plan your first event
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                Start by creating a request. Chefs will send proposals, and once you accept one, your booking
                will appear here.
              </p>
            </div>

            <ul className="space-y-3 text-sm text-slate-700">
              {[
                "Create a request",
                "Receive proposals",
                "Confirm booking",
              ].map((item, index) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button asChild className="h-12 rounded-full px-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <Link href="/dashboard/client/create-request">Create Request</Link>
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-700 via-slate-800 to-slate-900 p-6 text-white shadow-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:18px_18px] opacity-40" />
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/10" />
            <div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-indigo-300/20" />
            <div className="relative space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-200">Booking pipeline</p>
              <h3 className="text-xl font-semibold">Your Event Command Center</h3>
              <p className="max-w-sm text-sm text-slate-200">
                This is where your confirmed bookings, timelines, and chef coordination come together.
              </p>
            </div>
          </div>
        </section>
      ) : !filteredBookings.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-900">No bookings match this search or filter.</p>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your keywords, status, or sorting options.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((booking) => {
            const status = bookingStatusMeta[booking.status]
            const eventType = booking.proposal?.request?.title?.trim() || "Private Event"

            return (
              <article
                key={booking.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {booking.chef?.user?.name ?? "Chef"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{eventType}</p>
                  </div>
                  <Badge className={status.className}>{status.label}</Badge>
                </div>

                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
                    <span>{formatDate(booking.proposal?.request?.eventDate ?? booking.createdAt)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                    <span>{booking.proposal?.request?.location ?? "Location TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <DollarSign className="h-4 w-4 text-slate-500" />
                    <span>{formatPrice(booking.totalPrice)}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild className="rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-sm">
                    <Link href={`/dashboard/bookings/${booking.id}`}>View Details</Link>
                  </Button>

                  <Button variant="outline" size="sm" asChild className="rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-sm">
                    <Link href={`/dashboard/chat?userId=${booking.chef?.user?.id || ''}`}>
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      Message Chef
                    </Link>
                  </Button>

                  {status.isUpcoming && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-sm"
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={Boolean(cancelLoading[booking.id])}
                    >
                      {cancelLoading[booking.id] ? (
                        <>
                          <Spinner className="mr-1.5 h-3.5 w-3.5" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          Cancel Booking
                        </>
                      )}
                    </Button>
                  )}

                  {booking.status === "COMPLETED" && (
                    <Button size="sm" variant="secondary" asChild className="rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-sm">
                      <Link href={`/dashboard/bookings/${booking.id}#review`}>Leave Review</Link>
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
