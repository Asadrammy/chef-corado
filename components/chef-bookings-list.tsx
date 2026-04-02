"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table"

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"

type ChefBookingPayload = {
  id: string
  totalPrice: string
  status: BookingStatus
  client: {
    name: string | null
  }
  proposal: {
    request: {
      eventDate: string
      details: string | null
      location: string
    }
  }
}

const bookingStatusClasses: Record<BookingStatus, string> = {
  PENDING: "border-slate-200 bg-slate-100 text-slate-700",
  CONFIRMED: "border-emerald-200 bg-emerald-100 text-emerald-700",
  COMPLETED: "border-sky-200 bg-sky-100 text-sky-700",
  CANCELLED: "border-destructive/40 bg-destructive/5 text-destructive",
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

const formatPrice = (value: string) => {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return value
  }
  return `$${parsed.toFixed(2)}`
}

export function ChefBookingsList() {
  const [bookings, setBookings] = React.useState<ChefBookingPayload[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 bg-background/40 px-6 py-12">
        <Spinner className="text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">Loading bookings…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/60 bg-destructive/5 p-6 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!bookings.length) {
    return (
      <div className="rounded-3xl border border-border/80 bg-background/80 p-6 text-sm text-muted-foreground">
        No bookings yet. Accept a proposal to get started.
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-background/80 p-1 shadow-sm">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Total Price</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium">{booking.client?.name ?? "Client"}</TableCell>
              <TableCell>
                <p className="font-medium">{booking.proposal.request.location}</p>
                <p className="text-xs text-muted-foreground">{formatDate(booking.proposal.request.eventDate)}</p>
                {booking.proposal.request.details && (
                  <p className="text-xs text-muted-foreground">{booking.proposal.request.details}</p>
                )}
              </TableCell>
              <TableCell>{formatPrice(booking.totalPrice)}</TableCell>
              <TableCell>
                <Badge className={bookingStatusClasses[booking.status]}>
                  {booking.status[0] + booking.status.slice(1).toLowerCase()}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
