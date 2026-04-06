"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Calendar, User, ChefHat, Eye, CheckCircle2, Clock3, Sparkles, ArrowUpRight, Wallet } from "lucide-react"

// Prevent static generation
export const dynamic = 'force-dynamic'

interface Booking {
  id: string
  totalPrice: number
  status: string
  createdAt: string
  updatedAt: string
  client: {
    name: string
    email: string
  }
  chef: {
    user: {
      name: string
      email: string
    }
  }
  proposal?: {
    price: number
    message?: string
    menu?: {
      title: string
      price: number
    }
  } | null
  payments:
    | {
        amount?: number
        totalAmount?: number
        commission?: number
        commissionAmount?: number
        status?: string
      }[]
    | {
        amount?: number
        totalAmount?: number
        commission?: number
        commissionAmount?: number
        status?: string
      }
    | null
    | undefined
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/admin/bookings")
      if (!response.ok) {
        throw new Error("Failed to fetch bookings")
      }
      const data = await response.json()
      setBookings(data)
    } catch (err) {
      setError("Failed to load bookings")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      CONFIRMED: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      COMPLETED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      CANCELLED: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    } as const

    return (
      <Badge
        variant="outline"
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm",
          variants[status as keyof typeof variants] || "border-border/60 bg-muted/40 text-foreground"
        )}
      >
        {status}
      </Badge>
    )
  }

  const getNormalizedPayment = (payments: Booking["payments"]) => {
    if (Array.isArray(payments)) {
      return payments.find((entry) => Boolean(entry && entry.status)) ?? payments.find((entry) => Boolean(entry)) ?? null
    }

    if (payments && typeof payments === "object") {
      return payments
    }

    return null
  }

  const getPaymentBadge = (booking: Booking) => {
    const payment = getNormalizedPayment(booking.payments)

    if (!payment || !payment.status) {
      return (
        <Badge variant="outline" className="rounded-full border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          Unpaid
        </Badge>
      )
    }

    const tone = {
      PENDING: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      HELD: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      RELEASED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      COMPLETED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    } as const

    return (
      <Badge
        variant="outline"
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm",
          tone[payment.status as keyof typeof tone] || "border-border/60 bg-muted/40 text-foreground"
        )}
      >
        {payment.status}
      </Badge>
    )
  }

  const getInitials = (name?: string) => {
    return (
      name
        ?.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "U"
    )
  }

  const pendingBookings = bookings.filter((booking) => booking.status === "PENDING")
  const confirmedBookings = bookings.filter((booking) => booking.status === "CONFIRMED")
  const completedBookings = bookings.filter((booking) => booking.status === "COMPLETED")
  const totalVolume = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0)

  const stats = [
    {
      title: "Total bookings",
      value: bookings.length.toString(),
      meta: "All tracked booking records",
      icon: Wallet,
      accent: "from-violet-500/15 via-sky-500/10 to-transparent",
      iconClassName: "text-violet-600 dark:text-violet-300",
    },
    {
      title: "Pending review",
      value: pendingBookings.length.toString(),
      meta: "Awaiting confirmation",
      icon: Clock3,
      accent: "from-amber-500/15 via-orange-500/10 to-transparent",
      iconClassName: "text-amber-600 dark:text-amber-300",
    },
    {
      title: "Confirmed",
      value: confirmedBookings.length.toString(),
      meta: "Active booking flow",
      icon: Calendar,
      accent: "from-sky-500/15 via-indigo-500/10 to-transparent",
      iconClassName: "text-sky-600 dark:text-sky-300",
    },
    {
      title: "Completed",
      value: completedBookings.length.toString(),
      meta: `${totalVolume.toFixed(2)} total GMV`,
      icon: CheckCircle2,
      accent: "from-emerald-500/15 via-teal-500/10 to-transparent",
      iconClassName: "text-emerald-600 dark:text-emerald-300",
    },
  ]

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/80 px-5 py-4 shadow-sm shadow-black/5 backdrop-blur-xl">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading bookings</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 pb-10">
      <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-gradient-to-br from-background via-background to-muted/40 shadow-sm shadow-black/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_28%),radial-gradient(circle_at_left,rgba(168,85,247,0.08),transparent_24%)]" />
        <div className="relative flex flex-col gap-6 px-6 py-7 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-8">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className="rounded-full border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm"
              >
                Admin operations
              </Badge>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/15 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                Live booking oversight
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Booking Management
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Track booking activity, monitor operational status, and review customer-chef transactions from a single premium control surface.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[380px] lg:grid-cols-1">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm shadow-black/5 backdrop-blur-xl">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Booking volume
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                ${totalVolume.toFixed(2)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Across {bookings.length} total booking records
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Attention needed
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {pendingBookings.length} awaiting review
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-muted/60 text-foreground shadow-sm">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <Alert className="rounded-2xl border-destructive/20 bg-destructive/10 shadow-sm">
          <AlertDescription className="text-sm font-medium text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <Card
              key={stat.title}
              className="group relative overflow-hidden rounded-[24px] border border-border/60 bg-background/90 py-0 shadow-sm shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-xl hover:shadow-black/10"
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br", stat.accent)} />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
              <CardHeader className="relative px-6 pt-6 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {stat.title}
                    </CardDescription>
                    <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
                      {stat.value}
                    </CardTitle>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm shadow-black/5 transition-transform duration-300 group-hover:scale-105">
                    <Icon className={cn("h-5 w-5", stat.iconClassName)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative px-6 pb-6">
                <div className="rounded-2xl border border-border/50 bg-background/70 px-4 py-3 text-sm text-muted-foreground shadow-sm shadow-black/5">
                  {stat.meta}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <Card className="overflow-hidden rounded-[28px] border border-border/60 bg-background/95 py-0 shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border/50 px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Operations overview
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
                All bookings
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Review every booking, inspect client and chef details, and track payment and status progression without leaving the admin workspace.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm shadow-sm shadow-black/5">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Total rows
                </div>
                <div className="mt-1 font-semibold text-foreground">{bookings.length}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm shadow-sm shadow-black/5">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Pending action
                </div>
                <div className="mt-1 font-semibold text-foreground">{pendingBookings.length}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {bookings.length === 0 ? (
            <div className="px-6 py-16 text-center md:px-8">
              <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/50 shadow-sm">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">No bookings found</p>
                  <p className="text-sm text-muted-foreground">
                    Booking records will appear here once customers begin creating and confirming chef engagements.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto px-4 py-4 md:px-6 md:py-6">
              <div className="min-w-[1180px] rounded-[24px] border border-border/60 bg-muted/20 p-2 shadow-inner shadow-black/[0.02]">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      {[
                        "Booking",
                        "Client",
                        "Chef",
                        "Menu",
                        "Price",
                        "Payment",
                        "Status",
                        "Date",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground first:pl-5 last:pr-5"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => {
                      const clientName = booking.client.name || "Client"
                      const chefName = booking.chef.user.name || "Chef"
                      const payment = getNormalizedPayment(booking.payments)

                      return (
                        <tr key={booking.id} className="group">
                          <td colSpan={9} className="p-0 pt-2 first:pt-0">
                            <div className="rounded-[20px] border border-border/60 bg-background/90 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-border group-hover:bg-background group-hover:shadow-lg group-hover:shadow-black/[0.06]">
                              <div className="grid grid-cols-[1fr_1.35fr_1.35fr_1.2fr_1fr_0.95fr_0.85fr_0.95fr_0.8fr] items-center gap-3 px-5 py-4">
                                <div className="min-w-0">
                                  <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-foreground shadow-sm">
                                    #{booking.id.slice(-8)}
                                  </div>
                                  <div className="mt-3 text-sm font-medium text-foreground">
                                    {booking.proposal ? "Proposal booking" : "Instant booking"}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Booking record
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-sm font-semibold text-foreground shadow-sm">
                                      {getInitials(clientName)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="truncate">{clientName}</span>
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {booking.client.email}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-sm font-semibold text-foreground shadow-sm">
                                      {getInitials(chefName)}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                                        <span className="truncate">{chefName}</span>
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {booking.chef.user.email}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  {booking.proposal?.menu ? (
                                    <>
                                      <div className="truncate text-sm font-semibold text-foreground">
                                        {booking.proposal.menu.title}
                                      </div>
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        Menu base ${booking.proposal.menu.price.toFixed(2)}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-sm font-semibold text-foreground">
                                        {booking.proposal ? "Custom menu" : "Instant booking"}
                                      </div>
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        {booking.proposal?.message ? "Custom proposal attached" : "Direct booking flow"}
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div>
                                  <div className="text-lg font-semibold tracking-tight text-foreground">
                                    ${(booking.proposal?.price ?? booking.totalPrice).toFixed(2)}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Total ${booking.totalPrice.toFixed(2)}
                                  </div>
                                </div>

                                <div>
                                  {payment ? (
                                    <>
                                      <div className="text-base font-semibold text-emerald-600 dark:text-emerald-300">
                                        ${(payment.totalAmount ?? payment.amount ?? 0).toFixed(2)}
                                      </div>
                                      <div className="mt-2">{getPaymentBadge(booking)}</div>
                                    </>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="text-sm font-medium text-muted-foreground">No payment</div>
                                      <div>{getPaymentBadge(booking)}</div>
                                    </div>
                                  )}
                                </div>

                                <div>{getStatusBadge(booking.status)}</div>

                                <div>
                                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    {new Date(booking.createdAt).toLocaleDateString()}
                                  </div>
                                </div>

                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 rounded-xl border-border/60 bg-background/80 px-3 text-muted-foreground shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-muted/70 hover:text-foreground hover:shadow-md"
                                    onClick={() => window.open(`/dashboard/admin/bookings/${booking.id}`, '_blank')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
