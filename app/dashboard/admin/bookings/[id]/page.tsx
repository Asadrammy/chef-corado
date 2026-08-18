import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminActivityTimeline, AdminDataTable, AdminMetricGrid, AdminPageHeader, AdminStatusBadge } from "@/components/admin/admin-workspace"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatAdminDate, maskEmailForAdmin, maskTextForAdmin } from "@/lib/admin-format"
import { requireAdminPagePermission } from "@/lib/admin-rbac"
import { formatCurrency } from "@/lib/currency"
import {
  formatGuestSummary,
  formatServiceDateSummary,
  formatServiceTime,
  formatShortDate,
  parseJsonList,
} from "@/lib/multi-day-display"
import { prisma } from "@/lib/prisma"

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminPagePermission("bookings.view")
  const { id } = await params

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      chef: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      serviceDates: { orderBy: { sortOrder: "asc" } },
      proposal: {
        include: {
          lineItems: { orderBy: { sortOrder: "asc" } },
          request: {
            include: {
              multiDayDates: { orderBy: { sortOrder: "asc" } },
            },
          },
          menu: true,
        },
      },
      experience: true,
      payments: { include: { refunds: true, ledgerEntries: { orderBy: { createdAt: "desc" } } } },
      insuranceCoverage: {
        include: {
          platformPolicy: {
            select: {
              policyVersion: true,
              status: true,
              internalReference: true,
            },
          },
        },
      },
      disputes: { orderBy: { createdAt: "desc" } },
      ledgerEntries: { orderBy: { createdAt: "desc" } },
      review: true,
    },
  })

  if (!booking) notFound()

  const serviceDates = booking.serviceDates.length
    ? booking.serviceDates
    : booking.proposal?.request?.multiDayDates ?? []
  const isMultiDay = booking.proposal?.request?.requestMode === "MULTI_DAY" || serviceDates.length > 1

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
          { label: isMultiDay ? "Service dates" : "Event date", value: isMultiDay ? formatServiceDateSummary(serviceDates, booking.eventDate) : new Date(booking.eventDate).toLocaleDateString() },
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
      {isMultiDay ? (
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Multi-Day Service Dates</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{serviceDates.length} selected service days</p>
            <div className="grid gap-3 md:grid-cols-2">
              {serviceDates.map((day, index) => {
                const cuisines = parseJsonList(day.cuisineTypes)
                const dietary = parseJsonList(day.dietaryRequirements)
                return (
                  <div key={`${day.date}-${index}`} className="rounded-md border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{formatShortDate(day.date)}</p>
                        <p className="text-muted-foreground">{formatServiceTime(day)}</p>
                      </div>
                      <AdminStatusBadge status={day.serviceTypeLabel ?? day.serviceType ?? "Service TBD"} />
                    </div>
                    <div className="mt-3 space-y-1 text-muted-foreground">
                      <p><span className="font-medium text-foreground">Guests:</span> {formatGuestSummary(day)}</p>
                      <p><span className="font-medium text-foreground">Cuisine:</span> {cuisines.length ? cuisines.join(", ") : "Open to suggestions"}</p>
                      <p><span className="font-medium text-foreground">Dietary:</span> {dietary.length ? dietary.join(", ") : "None specified"}</p>
                      {"budget" in day && day.budget != null ? <p><span className="font-medium text-foreground">Budget:</span> {formatCurrency(Number(day.budget), booking.currency)}</p> : null}
                      {day.notes ? <p><span className="font-medium text-foreground">Notes:</span> {day.notes}</p> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card className="rounded-lg border-border shadow-sm">
        <CardHeader><CardTitle className="text-base">Platform Liability Coverage</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {booking.insuranceCoverage ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coverage status</p>
                <div className="mt-1"><AdminStatusBadge status={booking.insuranceCoverage.coverageStatus} /></div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coverage limit</p>
                <p className="mt-1 font-medium">{formatCurrency(booking.insuranceCoverage.coverageLimitMinor / 100, booking.insuranceCoverage.currency)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coverage period</p>
                <p className="mt-1">{formatShortDate(booking.insuranceCoverage.coverageStartAt)} - {formatShortDate(booking.insuranceCoverage.coverageEndAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Policy version</p>
                <p className="mt-1 font-medium">{booking.insuranceCoverage.policyVersion}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Qualified</p>
                <p className="mt-1">{formatAdminDate(booking.insuranceCoverage.qualifiedAt)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Qualification basis</p>
                <p className="mt-1">{booking.insuranceCoverage.qualificationBasis.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Internal reference</p>
                <p className="mt-1">{booking.insuranceCoverage.platformPolicy?.internalReference ?? "Not supplied"}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No booking-level platform insurance coverage association has been recorded for this booking.</p>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Proposal and Request</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-medium">Proposal:</span> {booking.proposal ? formatCurrency(booking.proposal.price, booking.currency) : "No proposal linked"}</p>
            <p><span className="font-medium">Menu:</span> {booking.proposal?.menu?.title ?? "No menu linked"}</p>
            <p><span className="font-medium">Request mode:</span> {booking.proposal?.request?.requestMode ?? "Not linked"}</p>
            {isMultiDay ? (
              <div>
                <p className="font-medium">Daily proposal line items:</p>
                {booking.proposal?.lineItems.length ? (
                  <div className="mt-2 space-y-2">
                    {booking.proposal.lineItems.map((item, index) => (
                      <div key={`${item.serviceDate}-${index}`} className="rounded-md border border-border p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{formatShortDate(item.serviceDate)}</p>
                            <p className="text-muted-foreground">{item.title}</p>
                            {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
                          </div>
                          <p className="font-semibold">{formatCurrency(item.price, item.currency)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Legacy Multi-Day proposal without daily line items.</p>
                )}
              </div>
            ) : null}
            <p><span className="font-medium">Special requests:</span> {booking.specialRequests ?? "None"}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-border shadow-sm">
          <CardHeader><CardTitle className="text-base">Payment and Refunds</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {booking.payments ? (
              <>
                <p><span className="font-medium">Payment:</span> {formatCurrency(booking.payments.totalAmount, booking.payments.currency)} / {booking.payments.status}</p>
                <p><span className="font-medium">ChefaChef service charge:</span> {formatCurrency(booking.payments.commissionAmount, booking.payments.currency)}</p>
                <p><span className="font-medium">Internal tax tracking:</span> {formatCurrency(booking.payments.serviceChargeTaxAmount, booking.payments.currency)} ({booking.payments.serviceChargeTaxStatus?.replace(/_/g, " ") ?? "legacy / not captured"})</p>
                <p><span className="font-medium">Total platform deduction:</span> {formatCurrency(booking.payments.totalPlatformDeduction ?? booking.payments.commissionAmount, booking.payments.currency)}</p>
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
