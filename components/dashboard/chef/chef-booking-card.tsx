"use client"

import * as React from "react"
import { CalendarDays, CheckCircle2, Clock3, Eye, MapPin, MessageSquare, Sparkles, WalletCards, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"

export type ChefBookingPayload = {
  id: string
  totalPrice: string
  status: BookingStatus
  eventDate: string
  location: string
  createdAt: string
  client: {
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
    case "PENDING":
      return {
        label: "Pending",
        className: "border-primary/20 bg-primary/10 text-primary",
        icon: Clock3,
      }
    case "CONFIRMED":
      return {
        label: "Upcoming",
        className: "border-primary/20 bg-primary/10 text-primary",
        icon: CalendarDays,
      }
    case "COMPLETED":
      return {
        label: "Completed",
        className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        icon: CheckCircle2,
      }
    case "CANCELLED":
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
      className="group w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow duration-200 hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 text-base font-semibold text-foreground break-words sm:text-lg">
                  {location}
                </h3>
                <Badge className={status.className}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.label}
                </Badge>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Price
              </p>
              <p className="text-base font-semibold text-foreground sm:text-lg">
                {formatPrice(booking.totalPrice)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2 min-w-0">
              <WalletCards className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{clientName}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0 sm:justify-end">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{formatDate(eventDate)}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0 sm:col-span-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{location}</span>
            </div>
          </div>

          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {details || "This booking was created from an accepted proposal. Open details to review the full event brief and next steps."}
          </p>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button
              variant="outline"
              className="h-10 min-w-0 flex-1 rounded-xl border-border/70 px-3"
            >
              <Eye className="h-4 w-4 shrink-0" />
              <span className="truncate">View Details</span>
            </Button>
            <Button className="h-10 min-w-0 flex-1 rounded-xl px-3">
              <MessageSquare className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isHovered ? "translate-x-0.5" : ""}`} />
              <span className="truncate">Message Client</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
