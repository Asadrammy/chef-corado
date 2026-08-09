import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminActivityTimeline, AdminDataTable, AdminMetricGrid, AdminPageHeader, AdminStatusBadge } from "@/components/admin/admin-workspace"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatAdminDate, maskEmailForAdmin, maskTextForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPagePermission("bookings.view")
  const { id } = await params

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      chef: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      proposal: { include: { request: true, menu: true } },
      experience: true,
      payments: { include: { refunds: true, ledgerEntries: { orderBy: { createdAt: "desc" } } } },
      disputes: { orderBy: { createdAt: "desc" } },
      ledgerEntries: { orderBy: { createdAt: "desc" } },
      review: true,
    },
  })

  if (!booking) notFound()

  const timeline = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Booking", entityId: booking.id },
        booking.payments ? { entityType: "Payment", entityId: booking.payments.id } : undefined,
      ].filter(Boolean) as { entityType: string; entityId: string }[],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations"
        title={`Booking ${booking.id}`}
        description="Booking lifecycle, people, service, proposal, payment, payout/refund signals, disputes, and audit trail."
        actions={<Button asChild variant="outline" size="sm" className="rounded-md"><Link href="/dashboard/admin/bookings">Back to bookings</Link></Button>}
      />
      <AdminMetricGrid
        metrics={[
          { label: "Booking status", value: <AdminStatusBadge status={booking.status} /> },
          { label: "Payment status", value: booking.payments ? <AdminStatusBadge status={booking.payments.status} /> : "No payment" },
          { label: "Total", value: formatCurrency(booking.totalPrice, booking.currency) },
          { label: "Event date", value: new Date(booking.eventDate).toLocaleDateString() },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Client</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{booking.client.name}</p>
            <p className="text-muted-foreground">{maskEmailForAdmin(booking.client.email, actor)}</p>
            <p className="text-muted-foreground">{maskTextForAdmin(booking.client.phone, actor)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Chef</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{booking.chef.user.name}</p>
            <p className="text-muted-foreground">{maskEmailForAdmin(booking.chef.user.email, actor)}</p>
            <p className="text-muted-foreground">{maskTextForAdmin(booking.chef.user.phone, actor)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Service</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{booking.serviceTypeLabel ?? booking.bookingType}</p>
            <p className="text-muted-foreground">{booking.location}</p>
            <p className="text-muted-foreground">Guests: {booking.guestCount} / billable {booking.billableGuestCount ?? booking.guestCount}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Proposal and Request</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-medium">Proposal:</span> {booking.proposal ? formatCurrency(booking.proposal.price, booking.currency) : "No proposal linked"}</p>
            <p><span className="font-medium">Menu:</span> {booking.proposal?.menu?.title ?? "No menu linked"}</p>
            <p><span className="font-medium">Request mode:</span> {booking.proposal?.request?.requestMode ?? "Not linked"}</p>
            <p><span className="font-medium">Special requests:</span> {booking.specialRequests ?? "None"}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Payment and Refunds</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {booking.payments ? (
              <>
                <p><span className="font-medium">Payment:</span> {formatCurrency(booking.payments.totalAmount, booking.payments.currency)} / {booking.payments.status}</p>
                <p><span className="font-medium">Platform fee:</span> {formatCurrency(booking.payments.commissionAmount, booking.payments.currency)}</p>
                <p><span className="font-medium">Chef net:</span> {formatCurrency(booking.payments.chefAmount, booking.payments.currency)}</p>
                <p><span className="font-medium">Refund count:</span> {booking.payments.refunds.length}</p>
              </>
            ) : "No payment record linked."}
          </CardContent>
        </Card>
      </div>
      <AdminDataTable
        rows={booking.disputes}
        emptyTitle="No disputes for this booking."
        columns={[
          { key: "reason", label: "Reason", render: (dispute) => dispute.reason },
          { key: "status", label: "Status", render: (dispute) => <AdminStatusBadge status={dispute.status} /> },
          { key: "created", label: "Created", render: (dispute) => formatAdminDate(dispute.createdAt) },
          { key: "resolution", label: "Resolution", render: (dispute) => dispute.resolution ?? "Not resolved" },
        ]}
      />
      <Card className="rounded-lg border-border shadow-sm">
        <CardHeader><CardTitle className="text-base">Audit Timeline</CardTitle></CardHeader>
        <CardContent>
          <AdminActivityTimeline items={timeline.map((log) => ({ id: log.id, action: log.action, meta: log.reason, createdAt: log.createdAt }))} />
        </CardContent>
      </Card>
    </div>
  )
}
