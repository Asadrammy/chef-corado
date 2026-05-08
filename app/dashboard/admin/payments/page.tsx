"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Calendar,
  User,
  ChefHat,
  ArrowUpRight,
  Wallet,
  Landmark,
  CreditCard,
  CheckCircle2,
} from "lucide-react"

interface Payment {
  id: string
  totalAmount: number
  commissionAmount: number
  chefAmount: number
  currency?: string
  status: "PENDING" | "HELD" | "RELEASED" | "COMPLETED"
  stripePaymentIntentId?: string
  createdAt: string
  updatedAt: string
  booking: {
    id: string
    totalPrice: number
    currency?: string
    status: string
    createdAt: string
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
  }
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/admin/payments")
      if (!response.ok) {
        throw new Error("Failed to fetch payments")
      }
      const data = await response.json()
      setPayments(data)
    } catch (err) {
      setError("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  const handleReleasePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to release this payment to the chef?")) {
      return
    }

    setActionLoading(paymentId)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/release`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to release payment")
      }

      setSuccess("Payment released successfully")
      fetchPayments()
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      setError("Failed to release payment")
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      HELD: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      RELEASED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      COMPLETED: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    } as const

    return (
      <Badge
        variant="outline"
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm",
          variants[status as keyof typeof variants]
        )}
      >
        {status}
      </Badge>
    )
  }

  const canRelease = (payment: Payment) => {
    return payment.status === "HELD" || payment.status === "PENDING"
  }

  const heldPayments = payments.filter((payment) => payment.status === "HELD" || payment.status === "PENDING")
  const releasedPayments = payments.filter((payment) => payment.status === "RELEASED" || payment.status === "COMPLETED")
  const heldTotal = heldPayments.reduce((sum, payment) => sum + payment.totalAmount, 0)
  const releasedTotal = releasedPayments.reduce((sum, payment) => sum + payment.totalAmount, 0)
  const commissionTotal = payments.reduce((sum, payment) => sum + payment.commissionAmount, 0)
  const totalVolume = payments.reduce((sum, payment) => sum + payment.totalAmount, 0)

  const stats = [
    {
      title: "Funds on hold",
      value: heldTotal,
      meta: `${heldPayments.length} payments awaiting release`,
      icon: Wallet,
      accent: "from-amber-500/15 via-orange-500/10 to-transparent",
      iconClassName: "text-amber-600 dark:text-amber-300",
      valueClassName: "text-foreground",
    },
    {
      title: "Released payouts",
      value: releasedTotal,
      meta: `${releasedPayments.length} payments processed`,
      icon: Landmark,
      accent: "from-emerald-500/15 via-emerald-500/10 to-transparent",
      iconClassName: "text-emerald-600 dark:text-emerald-300",
      valueClassName: "text-foreground",
    },
    {
      title: "Commission earned",
      value: commissionTotal,
      meta: `Across ${payments.length} total bookings`,
      icon: CreditCard,
      accent: "from-sky-500/15 via-indigo-500/10 to-transparent",
      iconClassName: "text-sky-600 dark:text-sky-300",
      valueClassName: "text-sky-600 dark:text-sky-300",
    },
  ]

  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "U"
    )
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/80 px-5 py-4 shadow-sm shadow-black/5 backdrop-blur-xl">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading payments</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-[28px] shadow-sm shadow-black/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_28%),radial-gradient(circle_at_left,rgba(16,185,129,0.08),transparent_24%)]" />
        <div className="relative flex flex-col gap-6 px-6 py-7 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-8">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className="rounded-full border-border/70 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm"
              >
                Admin finance
              </Badge>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Live payment monitoring
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Payment Management
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Track held funds, released payouts, and chef payment actions from a single premium operations workspace.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm shadow-black/5 backdrop-blur-xl">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Total volume
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {formatCurrency(totalVolume, payments[0]?.currency ?? "GBP")}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Across {payments.length} tracked payment records
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Action queue
                  </div>
                  <div className="mt-2 text-lg font-semibold text-foreground">
                    {heldPayments.length} awaiting review
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

      {success && (
        <Alert className="rounded-2xl border-emerald-500/20 bg-emerald-500/10 shadow-sm">
          <AlertDescription className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="rounded-2xl border-destructive/20 bg-destructive/10 shadow-sm">
          <AlertDescription className="text-sm font-medium text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
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
                    <CardTitle className={cn("text-3xl font-semibold tracking-tight", stat.valueClassName)}>
                      {formatCurrency(stat.value, payments[0]?.currency ?? "GBP")}
                    </CardTitle>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm shadow-black/5 transition-transform duration-300 group-hover:scale-105">
                    <Icon className={cn("h-5 w-5", stat.iconClassName)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative px-6 pb-6">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/70 px-4 py-3 shadow-sm shadow-black/5">
                  <p className="text-sm text-muted-foreground">{stat.meta}</p>
                  <Wallet className="h-4 w-4 text-muted-foreground/70" />
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
                All payments
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Review booking transactions, payout progress, and commission performance without leaving the admin workspace.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm shadow-sm shadow-black/5">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Total rows
                </div>
                <div className="mt-1 font-semibold text-foreground">{payments.length}</div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm shadow-sm shadow-black/5">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Pending action
                </div>
                <div className="mt-1 font-semibold text-foreground">{heldPayments.length}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {payments.length === 0 ? (
            <div className="px-6 py-16 text-center md:px-8">
              <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/50 shadow-sm">
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">No payments found</p>
                  <p className="text-sm text-muted-foreground">
                    Payment records will appear here once bookings start moving through the payout workflow.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto px-4 py-4 md:px-6 md:py-6">
              <div className="min-w-[1080px] rounded-[24px] border border-border/60 bg-muted/20 p-2 shadow-inner shadow-black/[0.02]">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      {[
                        "Booking",
                        "Client",
                        "Chef",
                        "Amount",
                        "Commission",
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
                    {payments.map((payment) => {
                      const clientName = payment.booking.client.name || "Client"
                      const chefName = payment.booking.chef.user.name || "Chef"
                      const releaseAllowed = canRelease(payment)

                      return (
                        <tr key={payment.id} className="group">
                          <td colSpan={8} className="p-0 pt-2 first:pt-0">
                            <div className="rounded-[20px] border border-border/60 bg-background/90 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-border group-hover:bg-background group-hover:shadow-lg group-hover:shadow-black/[0.06]">
                              <div className="grid grid-cols-[1.1fr_1.35fr_1.35fr_1fr_1fr_0.9fr_0.95fr_0.85fr] items-center gap-3 px-5 py-4">
                                <div className="min-w-0">
                                  <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-foreground shadow-sm">
                                    #{payment.booking.id.slice(-8)}
                                  </div>
                                  <div className="mt-3 text-sm font-medium text-foreground">
                                    Booking payment
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {new Date(payment.booking.createdAt).toLocaleDateString()}
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
                                        {payment.booking.client.email}
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
                                        {payment.booking.chef.user.email}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-lg font-semibold tracking-tight text-foreground">
                                    {formatCurrency(payment.totalAmount ?? 0, payment.currency ?? "GBP")}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Booking total {formatCurrency(payment.booking?.totalPrice ?? 0, payment.booking?.currency ?? payment.currency ?? "GBP")}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-base font-semibold text-sky-600 dark:text-sky-300">
                                    {formatCurrency(payment.commissionAmount ?? 0, payment.currency ?? "GBP")}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {payment.booking?.totalPrice
                                      ? ((payment.commissionAmount || 0) / payment.booking.totalPrice * 100).toFixed(1)
                                      : "0.0"}
                                    % platform fee
                                  </div>
                                </div>

                                <div>{getStatusBadge(payment.status)}</div>

                                <div>
                                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    {new Date(payment.createdAt).toLocaleDateString()}
                                  </div>
                                </div>

                                <div className="flex justify-end">
                                  {releaseAllowed ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleReleasePayment(payment.id)}
                                      disabled={actionLoading === payment.id}
                                      className="h-9 rounded-xl px-4 shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                      {actionLoading === payment.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <ArrowUpRight className="h-4 w-4" />
                                          Release
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Settled
                                    </div>
                                  )}
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
