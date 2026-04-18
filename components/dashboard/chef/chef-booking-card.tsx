"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { CalendarDays, Clock3, CheckCircle2, XCircle, WalletCards, MapPin, Eye, MessageSquare } from "lucide-react"
import { BookingStatus } from "@/types"

export type ChefBookingPayload = {
  id: string
  totalPrice: string
  status: BookingStatus
  eventDate: string
  location: string
  createdAt: string
  client: {
    id: string
    name: string | null
  }
  proposal?: {
    request?: {
      eventDate: string
      details: string | null
      location: string
    }
  }
}

interface ChefBookingCardProps {
  booking: ChefBookingPayload
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPrice(value: string) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return value
  }

  return `$${parsed.toFixed(2)}`
}

function getStatusConfig(status: BookingStatus) {
  switch (status) {
    case BookingStatus.PENDING:
      return {
        label: "Pending",
        className: "border-primary/20 bg-primary/10 text-primary",
        icon: Clock3,
      }
    case BookingStatus.CONFIRMED:
      return {
        label: "Upcoming",
        className: "border-primary/20 bg-primary/10 text-primary",
        icon: CalendarDays,
      }
    case BookingStatus.COMPLETED:
      return {
        label: "Completed",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        icon: CheckCircle2,
      }
    case BookingStatus.CANCELLED:
    default:
      return {
        label: "Cancelled",
        className: "border-destructive/20 bg-destructive/10 text-destructive",
        icon: XCircle,
      }
  }
}

export function ChefBookingCard({ booking }: ChefBookingCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const status = getStatusConfig(booking.status)
  const StatusIcon = status.icon
  const location = booking.proposal?.request?.location || booking.location
  const eventDate = booking.proposal?.request?.eventDate || booking.eventDate
  const details = booking.proposal?.request?.details
  const clientName = booking.client?.name || "Client"

  return (
    <Card
      className="group relative w-full overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,249,255,0.9))] shadow-lg shadow-slate-900/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_55%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_50%)] opacity-90" />
      <div className="relative p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-sm">
                Booking workspace
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="min-w-0 text-lg font-semibold tracking-tight text-foreground break-words sm:text-[1.35rem]">
                  {clientName}
                </h3>
                <Badge className={`rounded-full px-3 py-1 shadow-sm ${status.className}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{location}</p>
            </div>
            <div className="shrink-0 rounded-[22px] border border-white/60 bg-white/75 px-4 py-3 text-right shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Job value
              </p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
                {formatPrice(booking.totalPrice)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-full bg-muted/45 px-3 py-2 min-w-0">
              <WalletCards className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{clientName}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted/45 px-3 py-2 min-w-0 sm:justify-start">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{formatDate(eventDate)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted/45 px-3 py-2 min-w-0 sm:col-span-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{location}</span>
            </div>
          </div>

          <p className="line-clamp-2 text-sm leading-7 text-muted-foreground">
            {details || "This booking was created from an accepted proposal. Open details to review the full event brief and next steps."}
          </p>

          <div className="flex flex-col gap-2.5 border-t border-border/50 pt-4 sm:flex-row">
            <Button
              variant="outline"
              className="h-11 min-w-0 flex-1 rounded-2xl border-white/70 bg-white/75 px-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
              asChild
            >
              <Link href={`/dashboard/bookings/${booking.id}`}>
                <Eye className="h-4 w-4 shrink-0" />
                <span className="truncate">View</span>
              </Link>
            </Button>
            <Button className="h-11 min-w-0 flex-1 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(249_90%_68%))] px-4 shadow-lg shadow-primary/20" asChild>
              <Link href={`/dashboard/chef/messages/${booking.client.id}`}>
                <MessageSquare className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isHovered ? "translate-x-0.5" : ""}`} />
                <span className="truncate">Message</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
