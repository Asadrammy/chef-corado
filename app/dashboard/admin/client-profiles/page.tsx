import { Metadata } from "next"
import Link from "next/link"
import type React from "react"
import { CalendarDays, CreditCard, FileText, MessageCircle, Star, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAdminPagePermission, maskEmail } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"
import { generateMeta } from "@/lib/utils"

export const metadata: Metadata = generateMeta({
  title: "Client Profiles",
  description: "Inspect client request, booking, payment, support, and review history.",
})

export default async function AdminClientProfilesPage() {
  const admin = await requireAdminPagePermission("users.view")
  const canViewPii = admin.permissions.includes("pii.view")
  const canViewFinance = admin.permissions.includes("finance.view") || admin.permissions.includes("payments.view")

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      requests: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          payments: true,
          disputes: true,
          review: true,
        },
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      _count: {
        select: {
          requests: true,
          bookings: true,
          reviews: true,
          notifications: true,
        },
      },
    },
  })

  const supportTickets = await prisma.supportTicket.findMany({
    where: { requesterId: { in: clients.map((client) => client.id) } },
    orderBy: { createdAt: "desc" },
    select: {
      requesterId: true,
      status: true,
      priority: true,
      subject: true,
      createdAt: true,
    },
  })
  const ticketsByClient = new Map<string, typeof supportTickets>()
  supportTickets.forEach((ticket) => {
    if (!ticket.requesterId) return
    ticketsByClient.set(ticket.requesterId, [...(ticketsByClient.get(ticket.requesterId) ?? []), ticket])
  })

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-border/60 bg-background/95 px-6 py-6 shadow-sm shadow-black/5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Client Profiles</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Permission-aware client operations view for identity, requests, bookings, payments, communications, support, disputes, and reviews.
        </p>
      </div>

      <div className="grid gap-4">
        {clients.map((client) => {
          const tickets = ticketsByClient.get(client.id) ?? []
          const totalSpendByCurrency = client.bookings.reduce((acc, booking) => {
            const currency = booking.currency || "GBP"
            acc.set(currency, (acc.get(currency) ?? 0) + booking.totalPrice)
            return acc
          }, new Map<string, number>())
          const spendSummary = Array.from(totalSpendByCurrency.entries())
            .map(([currency, amount]) => formatCurrency(amount, currency))
            .join(" / ") || "No completed spend"

          return (
            <Card key={client.id} className="rounded-[24px] border-border/60">
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-muted/40">
                      <UserRound className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{canViewPii ? client.email : maskEmail(client.email)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {client.isBanned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="outline">Active</Badge>}
                    <Badge variant="secondary">{client._count.requests} requests</Badge>
                    <Badge variant="secondary">{client._count.bookings} bookings</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-4">
                <ProfileMetric icon={<FileText className="h-4 w-4" />} label="Latest request" value={client.requests[0]?.title ?? client.requests[0]?.eventType ?? "No requests"} />
                <ProfileMetric icon={<CalendarDays className="h-4 w-4" />} label="Latest booking" value={client.bookings[0]?.status ?? "No bookings"} />
                <ProfileMetric icon={<CreditCard className="h-4 w-4" />} label="Payment history" value={canViewFinance ? spendSummary : "Restricted"} />
                <ProfileMetric icon={<Star className="h-4 w-4" />} label="Reviews" value={`${client._count.reviews} submitted`} />

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 lg:col-span-2">
                  <p className="text-sm font-semibold text-foreground">Support and disputes</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {tickets.slice(0, 3).map((ticket) => (
                      <p key={`${ticket.requesterId}-${ticket.createdAt.toISOString()}-${ticket.subject}`}>
                        {ticket.priority} · {ticket.status} · {ticket.subject}
                      </p>
                    ))}
                    {tickets.length === 0 ? <p>No support tickets.</p> : null}
                    {client.bookings.some((booking) => booking.disputes.length > 0) ? <p>Dispute history present on booking records.</p> : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 lg:col-span-2">
                  <p className="text-sm font-semibold text-foreground">Communication and preferences</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>{client._count.notifications} notifications recorded.</p>
                    <p>Dietary preferences are captured per request and shown in request detail records.</p>
                    <Link href={`/dashboard/admin/users?query=${encodeURIComponent(client.email)}`} className="font-medium text-primary">
                      Open user controls
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ProfileMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
