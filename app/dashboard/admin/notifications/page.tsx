import { Metadata } from "next"
import { Bell, CircleAlert, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { prisma } from "@/lib/prisma"
import { generateMeta } from "@/lib/utils"

export const metadata: Metadata = generateMeta({
  title: "Admin Notifications",
  description: "Review operational alerts and notification activity.",
})

const criticalTypes = new Set([
  "SUPPORT_TICKET_CREATED",
  "DISPUTE_CREATED",
  "REFUND_REQUESTED",
  "PAYMENT_FAILED",
  "PAYOUT_FAILED",
  "FULL_TIME_ENQUIRY_CREATED",
  "COMPLIANCE_REVIEW_REQUIRED",
])

type AdminNotificationRow = {
  id: string
  type: string
  message: string
  isRead: boolean
  createdAt: Date
  user: {
    id: string
    role: string
    name: string | null
  }
}

export default async function AdminNotificationsPage() {
  await requireAdminPagePermission("notifications.view")

  const [notifications, supportTickets, disputes, refunds, fullTimeEnquiries] = await Promise.all([
    prisma.notification.findMany({
      select: {
        id: true,
        type: true,
        message: true,
        isRead: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            role: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }) as Promise<AdminNotificationRow[]>,
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    prisma.refund.count({ where: { status: { in: ["PENDING", "APPROVED"] } } }),
    prisma.fullTimeChefEnquiry.count({ where: { status: { in: ["NEW", "QUALIFYING"] } } }),
  ])

  const criticalCount = notifications.filter((notification) => criticalTypes.has(notification.type)).length

  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-border/60 bg-background/95 px-6 py-6 shadow-sm shadow-black/5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Notifications</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Operational alert review for support, compliance, refunds, disputes, failed financial events, payout issues, and full-time enquiries.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <AlertMetric label="Critical alerts" value={criticalCount} />
        <AlertMetric label="Support" value={supportTickets} />
        <AlertMetric label="Disputes" value={disputes} />
        <AlertMetric label="Refunds" value={refunds} />
        <AlertMetric label="Full-time" value={fullTimeEnquiries} />
      </div>

      <Card className="rounded-[28px] border-border/60">
        <CardHeader>
          <CardTitle>Latest Notification Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
              No notifications have been recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const critical = criticalTypes.has(notification.type)

                return (
                  <div key={notification.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${critical ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {critical ? <CircleAlert className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={critical ? "destructive" : "secondary"}>{notification.type}</Badge>
                          <span className="text-xs text-muted-foreground">{notification.createdAt.toLocaleString()}</span>
                        </div>
                        <p className="mt-2 text-sm text-foreground">{notification.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recipient: {notification.user.name} ({notification.user.role})
                        </p>
                      </div>
                    </div>
                    <Badge variant={notification.isRead ? "outline" : "default"}>
                      {notification.isRead ? "Read" : "Unread"}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AlertMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-[22px] border-border/60">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
